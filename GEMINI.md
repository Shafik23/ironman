# GEMINI.md

This file provides guidance to Gemini when working with code in this repository.

## Project Overview

This is an Iron Man suit designer web application that creates an interactive, retro-futuristic interface for configuring and monitoring various suit systems. The application simulates a MK-VII prototype configuration system with real-time telemetry, component selection, and visual schematic interactions.

## File Structure

- `index.html` - Main HTML structure with SVG schematic and interface panels
- `script.js` - Core JavaScript functionality for interactions, telemetry, and audio
- `style.css` - Comprehensive CSS with cyberpunk/retro-futuristic styling
- `ironman.mp3` - Background music file for party mode
- `hose.mp3` - Additional audio file for sound effects
- `deploy.sh` - Production deployment script using rsync
- `push_all_changes.sh` - Git workflow helper script

## Development Commands

This is a static web application that can be run directly in a browser:

```bash
# Serve locally (using any static server)
python -m http.server 8000
# or
npx serve .
# or simply open index.html in a browser
```

### Deployment Commands

```bash
# Deploy to production server
./deploy.sh

# Quick git commit and push workflow
./push_all_changes.sh "commit message"
```

## Architecture & Key Patterns

### Component System
The application uses a component-based approach where suit parts are represented in three synchronized layers:
- **Component List** (left panel): Interactive list items with status indicators
- **SVG Schematic** (center): Visual representation with hover tooltips
- **Component Mapping**: JavaScript object linking list items to schematic parts

### State Management
- Component selection state synchronized between UI elements
- Real-time telemetry updates with timestamped log entries
- Configuration sliders update system metrics dynamically
- Audio state management for background music toggle

### Key JavaScript Patterns
- **Event Delegation**: Component selection and schematic interaction
- **Data Attributes**: `data-component` and `data-part` for element mapping
- **Animation Coordination**: CSS animations triggered by JavaScript state changes
- **Telemetry System**: Automated log updates with message rotation and entry limits

### Styling Architecture
- **CSS Custom Properties**: Consistent theming with cyberpunk color palette
- **Component-Based CSS**: Modular styles for reusable interface elements  
- **Animation System**: Keyframe animations for glow effects, pulses, and transitions
- **Responsive Design**: Flex-based layout that adapts to different screen sizes

### Key Features
- Interactive SVG schematic with hover tooltips and click-to-select
- Real-time telemetry log with automatic updates
- Configuration sliders affecting system status bars
- Keyboard shortcuts (1-6 for components, M for music, I/D/Esc for commands)
- Party Mode toggle with background music and visual effects
- Scan line overlay effect for retro CRT appearance
- Component status cycling and diagnostic modes

### Data Flow
1. User interaction (click/hover) → Event handler
2. State update → Visual feedback (highlighting, selection)
3. Telemetry entry → Log update with timestamp
4. Configuration change → Progress bar updates
5. Periodic updates → System metrics and random telemetry

## Development Guidelines

- Whatever you do, always make sure it's "ironman" themed.
- The application uses a component mapping system (`componentMapping` object) to sync UI elements with SVG schematic parts
- All telemetry messages should maintain the technical/futuristic tone with system-specific terminology
- Audio files are loaded dynamically - handle errors gracefully for missing audio files
- Party mode affects multiple visual systems simultaneously (colors, status indicators, animations)

## Important Development Notes

- Components are identified by `data-component` and `data-part` attributes for event delegation
- SVG schematic parts must correspond to entries in the `componentMapping` object
- Telemetry system has a maximum entry limit and auto-rotates old messages
- All animations are CSS-based and triggered via JavaScript class manipulation
- The deployment script assumes a specific server configuration (`root@pollamin01`)
