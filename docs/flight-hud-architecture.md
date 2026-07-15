# Flight, Three.js, and HUD Architecture

This document explains how HUD mode fits into the suit designer and how the
first-person flight game is divided into modules.

## Mental model

HUD mode has two rendering layers:

1. Three.js renders the city, sky, drones, projectiles, and explosions into
   `#hudCanvas`.
2. HTML, CSS, SVG, and a small 2D canvas render the Iron Man visor
   instrumentation above the Three.js canvas.

`js/flight/engine.js` coordinates the game. `js/hud.js` is the adapter between
that game and the rest of the suit-designer application.

```text
Suit model + systems telemetry
             |
             v
          hud.js
   lifecycle + integration
             | environment
             v
Input --> Flight engine --> Three.js scene --> WebGL canvas
             |
             +--> per-frame snapshot --> DOM/2D HUD overlay
             |
             +--> mission events --> telemetry + wave banners
```

There is no entity-component system or generalized game framework. The design
is a direct collection of focused modules coordinated by one engine closure.

## Entry point and lifecycle

[`js/app.js`](../js/app.js) calls `setupHudMode()` during application startup,
after centralized DOM references and keyboard shortcuts are initialized.

[`js/hud.js`](../js/hud.js) owns the HUD-mode lifecycle:

- The HUD button and `H` shortcut toggle the canonical `modes.hud` state in
  [`js/suit-model.js`](../js/suit-model.js).
- Activation shows `#hudOverlay`, hides the schematic interface, and
  automatically arms the helmet, repulsors, and thrusters through normal suit
  model mutations.
- The flight engine is dynamically imported on first activation. This keeps
  Three.js and the 3D scene out of the initial schematic-view startup path.
- The created engine and its import promise are cached and reused.
- Deactivation stops the animation loop, clears held input, and suspends flight
  audio. It does not dispose of or reset the engine.
- Emergency shutdown automatically deactivates HUD mode.
- A failure while loading or constructing the WebGL renderer displays the
  visor-render fallback without taking down the rest of the application.

Because deactivation only calls `engine.stop()`, re-entering HUD mode resumes
the existing flight position, drones, wave, and score. The engine exposes
`resetMission()`, but nothing currently calls it.

The full-screen canvas and visor markup live in [`index.html`](../index.html).
[`css/hud.css`](../css/hud.css) controls the overlay shell and full-screen
effects, while [`css/hud-elements.css`](../css/hud-elements.css) styles the
instrumentation.

## Module responsibilities

| Module | Responsibility |
| --- | --- |
| [`engine.js`](../js/flight/engine.js) | Renderer, scene, game loop, mission state, collisions, lock-on, firing, scoring, and subsystem coordination |
| [`physics.js`](../js/flight/physics.js) | Pure flight calculations using plain objects; no DOM or Three.js dependencies |
| [`input.js`](../js/flight/input.js) | Keyboard and pointer state; maps WASD/arrows, Shift, and Space/click to flight commands |
| [`city.js`](../js/flight/city.js) | Procedural city, traffic, Stark Tower, and building collision heights |
| [`sky.js`](../js/flight/sky.js) | Sky dome, stars, moon, clouds, and scene lighting |
| [`drones.js`](../js/flight/drones.js) | Drone entities, spawning, patrol steering, and evade behavior |
| [`effects.js`](../js/flight/effects.js) | Pooled repulsor bolts, explosions, shared lights, and boost streaks |
| [`audio.js`](../js/flight/audio.js) | Runtime-generated WebAudio effects |
| [`hud-overlay.js`](../js/flight/hud-overlay.js) | Converts engine snapshots into compass, radar, targeting, gauges, warnings, and visual effects |

## Frame loop

`engine.start()` begins a `requestAnimationFrame` loop. Each frame performs the
following work in order:

1. Clamp elapsed time to a maximum of 50 milliseconds.
2. Read the current flight input.
3. Advance the pure flight model.
4. Check building collisions.
5. Wrap the player around the repeating city tile.
6. Copy flight position and attitude to the Three.js camera rig.
7. Update the sky, traffic, and drone AI.
8. Advance waves, target lock, firing, and projectile hits.
9. Update explosions, boost streaks, and thruster audio.
10. Render the Three.js scene.
11. Build a plain-data snapshot and send it to the HUD overlay.

The time-step clamp prevents a stalled or backgrounded tab from producing one
extreme simulation step when rendering resumes.

Before the first live frame, the engine performs a warm-up render containing a
hidden drone, bolt, and explosion. This compiles relevant shaders and prepares
first-draw pipelines so the first real wave or shot is less likely to stall.

## Flight model and controls

[`js/flight/physics.js`](../js/flight/physics.js) deliberately contains no DOM
or Three.js code. `stepFlight(state, input, environment, dt)` mutates a plain
flight state with position, heading, pitch, bank, speed, boost state, and
warning flags.

The model includes:

- Arc-power-scaled cruise speed
- Reduced thrust when the thruster module is offline
- Boost gated by online thrusters and at least 30% effective power
- Speed-dependent yaw and visual banking
- Climb and dive speed effects
- Stall sinking
- Minimum altitude and service-ceiling limits

[`js/flight/input.js`](../js/flight/input.js) attaches its listeners once. The
listeners are global, but keydown and fire actions only take effect while HUD
mode is active. Input is represented as normalized pitch and yaw axes plus a
held boost flag. Firing is edge-triggered, so a keypress or canvas click is
consumed once rather than firing on every frame.

The application-level keyboard handler leaves `Q`, `E`, `H`, and Escape active
in HUD mode. `Q` and `E` change suit power, `H` leaves HUD mode, and Escape runs
the full emergency shutdown flow.

## Suit-model integration

The engine does not own suit configuration. `js/hud.js` projects the canonical
suit state into a small engine environment:

```js
{
  power,
  repulsorsOnline,
  thrustersOnline,
  helmetOnline
}
```

There are two update paths:

1. Suit-model subscriptions propagate component availability changes.
2. The one-second systems simulation sends `effectivePower` through the
   `SYSTEMS_TICK` event.

Effective power, rather than only the configured power slider, controls flight
performance. It can reflect system throttling and other live simulation
effects.

The integration has visible gameplay consequences:

- Low effective power reduces cruise speed.
- Effective power below 30% prevents boost.
- Offline thrusters reduce available thrust and prevent boost.
- Offline repulsors prevent firing.
- An offline helmet visually degrades the DOM HUD.

## Repeating city and collision model

[`js/flight/city.js`](../js/flight/city.js) deterministically generates one
2.2-kilometer square city tile from a fixed random seed. It renders the tile as
a 3-by-3 grid of clones that share geometry and buffers.

When the player crosses a tile boundary, the engine moves the player one tile
in the opposite direction. It shifts drones, drone AI targets, active bolts,
and explosions by the same amount. Their positions relative to the player stay
the same, producing an endless-city illusion without continuously generating
new city geometry.

City collision is intentionally cheap. Buildings are registered in a repeating
spatial grid, and `city.sampleHeight(x, z)` returns the height at a horizontal
position. The engine treats a flight altitude below that height as an impact,
backs the player away, moves them above the obstacle, reduces speed, applies a
score penalty, and triggers feedback effects.

The sky uses a related illusion: the dome, stars, and moon follow the player
horizontally, while clouds drift and wrap around the player.

## Drones, combat, and missions

The engine owns mission and scoring rules. The drone and effects modules own
their narrower entity and presentation responsibilities.

- The first wave begins after a short delay, with fixed breaks between waves.
- Wave size grows up to eight drones.
- Drones spawn around the player above sampled rooftops.
- Drone AI selects nearby terrain-aware patrol points and performs a lateral
  evade when the engine marks the drone as locked.
- A target inside a 9-degree cone and 850-meter range accumulates lock over
  0.75 seconds. Lock progress decays when the target leaves the cone.
- A completed lock makes repulsor bolts home toward the selected drone.
  Unlocked shots travel straight forward.
- Bolt and explosion objects come from fixed pools to reduce per-shot
  allocations and shader/pipeline churn.
- Projectile collision uses a radius check against drones. The effects module
  reports hits; the engine removes drones, awards score, and advances missions.

Mission transitions are published through the shared event bus:

- `MISSION_START`
- `MISSION_THREAT_NEUTRALIZED`
- `MISSION_SUCCESS`

[`js/telemetry.js`](../js/telemetry.js) consumes those events for the main
telemetry log. The HUD overlay consumes start and success events for wave
banners.

## Three.js-to-HUD boundary

The DOM HUD does not receive Three.js objects. At the end of each frame, the
engine projects drone positions through the camera and builds a snapshot of
plain values:

- Flight attitude, altitude, speed, and boost state
- Projected target screen coordinates and distances
- Lock state and progress
- Heading-relative radar contacts
- Off-screen threat direction
- Nearest repeating Stark Tower bearing and distance
- Score, wave state, and remaining threats
- Transient fire, collision, and system-warning flags

[`js/flight/hud-overlay.js`](../js/flight/hud-overlay.js) consumes the snapshot.
Compass, pitch ladder, target brackets, radar, gauntlet flashes, boost effects,
and collision effects update every rendered frame. Numeric readouts, warnings,
and gauges are throttled to 10 Hz to reduce DOM churn.

The radar is a normal 2D canvas rather than part of the Three.js scene. This
keeps the visor instrumentation independent from WebGL scene objects.

## Audio

Flight audio is synthesized at runtime with WebAudio; it does not use the
repository's MP3 assets. A continuous filtered-noise thruster follows speed and
boost state. Repulsor, explosion, target-lock, and crash sounds use short
oscillator and noise effects.

Audio initialization is lazy and failure-tolerant. If WebAudio is unavailable,
the module disables flight audio without stopping gameplay.

## Testing boundary

[`test/flight-physics.test.js`](../test/flight-physics.test.js) exercises the
pure physics seam, including:

- Power-scaled cruise speed
- Boost behavior and low-power gating
- Turning, banking, and heading normalization
- Coordinate conventions
- Climbing, diving, and altitude limits
- Offline-thruster degradation

The generic event bus also has unit coverage. The following browser-dependent
behavior currently relies on manual testing:

- Three.js renderer and scene construction
- Start/stop and re-entry lifecycle
- City wrapping and building collision integration
- Drone waves, target lock, firing, and scoring
- WebAudio behavior
- Engine snapshot projection and DOM HUD updates
- End-to-end suit-model-to-flight integration

Use `npm run verify` for the canonical automated check, then use `./dev.sh` to
exercise HUD mode in a browser when changing the runtime or its integration.
