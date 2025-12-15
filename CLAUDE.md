# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Iron Man suit designer web application that creates an interactive, retro-futuristic interface for configuring and monitoring various suit systems. The application simulates a MK-VII prototype configuration system with real-time telemetry, component selection, and visual schematic interactions.

## File Structure

### Root Files
- `index.html` - Main HTML structure with SVG schematic and interface panels
- `style.css` - Main CSS file that imports modular stylesheets
- `ironman.mp3` - Background music file for party mode
- `hose.mp3` - Audio file for emergency shutdown effects

### Scripts
- `serve.py` - Local development server for ES6 modules
- `serve_live.py` - Live reload server (auto-refreshes browser on file changes)
- `dev.sh` - Convenience script to start live reload server and open browser
- `deploy.sh` - Production deployment script using rsync
- `push_all_changes.sh` - Git workflow script (add, commit, push)
- `bust-cache.sh` - Cache-busting script for deployments

### CSS Architecture (`css/`)
- `variables.css` - CSS custom properties and color schemes
- `base.css` - Base styles, fonts, and CRT scan lines effect
- `main.css` - Layout, panels, headers, scrollbars
- `components.css` - Buttons, toggles, component list, status bars
- `schematic.css` - SVG schematic and tooltip styling
- `animations.css` - All keyframe animations (reactor, party, diagnostics, emergency)

### JavaScript Modules (`js/`)
**Core:**
- `app.js` - Main entry point and initialization
- `dom.js` - Centralized DOM element references
- `state.js` - Application state management
- `events.js` - Pub/sub event bus for decoupled communication
- `constants.js` - Component mappings and tooltip content

**Features:**
- `components.js` - Component selection logic
- `schematic.js` - SVG schematic interactions
- `config.js` - Configuration sliders (power, color, zoom) and arc reactor dynamics
- `commands.js` - Command buttons (initialize, diagnostics, emergency)
- `party.js` - Party mode and music functionality
- `telemetry.js` - Event-driven telemetry logging system
- `keyboard.js` - Keyboard shortcuts
- `jarvis.js` - J.A.R.V.I.S. voice assistant (disabled, needs work)

**Subdirectories:**
- `effects/shutdown.js` - Emergency shutdown visual effects (fire extinguisher animation)
- `utils/timing.js` - Debounce and throttle utilities

## Development Commands

```bash
# Serve locally with ES6 module support
./serve.py

# Or use dev script for live reload (launches server + opens browser)
./dev.sh
```

### Deployment Commands

```bash
# Deploy to production server
./deploy.sh

# Quick git commit and push workflow
./push_all_changes.sh "commit message"
```

## Architecture & Key Patterns

### Module Architecture
The application is built using ES6 modules for clean separation of concerns:
- **Entry Point**: `app.js` initializes all modules and coordinates startup
- **Shared State**: `state.js` contains application-wide state flags
- **DOM References**: `dom.js` centralizes all DOM element access
- **Feature Modules**: Each major feature (components, config, commands, etc.) is isolated

### Component System
Suit parts are represented in three synchronized layers:
- **Component List** (left panel): Interactive list items with status indicators
- **SVG Schematic** (center): Visual representation with hover tooltips
- **Component Mapping**: Centralized in `constants.js` linking list items to schematic parts

### State Management
- Component selection state synchronized via `components.js`
- Real-time telemetry updates via `telemetry.js`
- Configuration sliders managed by `config.js`
- Party mode state handled by `party.js`

### Event-Driven Architecture
The application uses a pub/sub event bus (`events.js`) for decoupled communication:
- `on(event, handler)` - Subscribe to events
- `off(event, handler)` - Unsubscribe
- `emit(event, payload)` - Publish events
- Modules emit events for state changes (e.g., `component:selection`, `system:initialize`, `party:start`)
- `telemetry.js` subscribes to all events and logs them
- `jarvis.js` listens for important events and announces them

### Key JavaScript Patterns
- **ES6 Modules**: Clean imports/exports for dependency management
- **Event Bus**: Decoupled communication between modules
- **Event Delegation**: Component selection and schematic interaction
- **Data Attributes**: `data-component` and `data-part` for element mapping
- **Centralized DOM**: All element references initialized once in `dom.js`
- **CSS-Driven Animations**: JavaScript adds/removes classes to trigger CSS animations

### Key Features
- Interactive SVG schematic with hover tooltips and click-to-select
- Real-time telemetry log with automatic event-driven updates
- Configuration sliders affecting system status bars
- Arc reactor power dynamics (color/glow intensity based on power level)
- Party Mode toggle with background music, color cycling, and dancing animations
- Emergency shutdown with physics-based fire extinguisher animation
- Diagnostic mode with system scanning animation
- J.A.R.V.I.S. voice assistant with speech synthesis/recognition (disabled)

### Keyboard Shortcuts
- **1-6**: Select components by index
- **M**: Toggle music (party mode)
- **J**: Toggle J.A.R.V.I.S.
- **I**: Initialize Systems
- **D**: Run Diagnostics
- **Esc**: Emergency Shutdown

## Design System

### Color Scheme
- Primary Cyan: `#00ffff`
- Secondary Blue: `#0080ff`
- Accent Gold: `#ffd700`
- Danger Red: `#ff4444`
- Success Green: `#00ff80`
- Dark Background: `#0a0a0a`
- Panel Background: `#1a1a2e`

### Typography
- Primary Font: Orbitron (retro-futuristic, from Google Fonts)
- Monospace fallback for code elements

### Visual Effects
- CRT scan lines overlay effect
- Glow shadows on text and UI elements
- Radial gradients for depth
- Drop shadows on SVG elements

## J.A.R.V.I.S. Voice Assistant

The J.A.R.V.I.S. module (`js/jarvis.js`) is fully implemented but currently disabled in the HTML (commented out). Features include:
- **Speech Synthesis**: Announces system events using Web Speech API
- **Speech Recognition**: Voice commands (initialize, diagnostics, emergency, party mode, component selection)
- **Voice Selection**: Prefers male voices (Daniel, James, Oliver)
- **Phrase System**: Context-aware phrases for greetings, power levels, component changes, etc.
- **Visual Indicator**: Gold pulsing circle that brightens when speaking

To enable, uncomment the J.A.R.V.I.S. toggle and indicator in `index.html` (lines ~37-39).

## Development Guidelines

- Whatever you do, always make sure it's "ironman" themed
- Module imports must use relative paths (e.g., `./dom.js`)
- All DOM references should go through `dom.js` to avoid duplication
- Component mappings are centralized in `constants.js`
- State flags are centralized in `state.js`
- Each module should have a single, clear responsibility
- CSS is modularized: add new styles to appropriate files in `css/` directory
- CSS variables for theming are defined in `css/variables.css`
- New events should be emitted via `events.js` for telemetry integration
- Visual effects should be modularized under `js/effects/`

## Cache Busting

The project uses a cache-busting system to ensure browsers load fresh assets:
- `bust-cache.sh` updates query parameters (`?v=timestamp`) in `index.html`
- A pre-commit Git hook automatically runs cache busting before commits
- This ensures production deployments always serve the latest code

## Important Development Notes

- ES6 modules require a web server (use `./serve.py` for local development)
- Components are identified by `data-component` and `data-part` attributes
- Telemetry system has a 20-entry limit and auto-rotates old messages
- All animations are CSS-based and triggered via JavaScript class manipulation
- Circular dependencies between modules should be avoided
- The deployment script syncs the `js/` and `css/` folders to production
- Animation CSS is extensive (~570 lines) - check `css/animations.css` before adding new ones