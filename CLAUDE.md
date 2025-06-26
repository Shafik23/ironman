# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Iron Man suit designer web application that creates an interactive, retro-futuristic interface for configuring and monitoring various suit systems. The application simulates a MK-VII prototype configuration system with real-time telemetry, component selection, and visual schematic interactions.

## File Structure

- `index.html` - Main HTML structure with SVG schematic and interface panels
- `style.css` - Comprehensive CSS with cyberpunk/retro-futuristic styling
- `js/` - Modular ES6 JavaScript architecture:
  - `app.js` - Main entry point and initialization
  - `constants.js` - Component mappings and tooltip content
  - `dom.js` - DOM element references
  - `state.js` - Application state management
  - `components.js` - Component selection logic
  - `schematic.js` - SVG schematic interactions
  - `config.js` - Configuration sliders (power, color, zoom)
  - `commands.js` - Command buttons (initialize, diagnostics, emergency)
  - `party.js` - Party mode and music functionality
  - `telemetry.js` - Telemetry logging system
  - `keyboard.js` - Keyboard shortcuts
- `ironman.mp3` - Background music file for party mode
- `hose.mp3` - Audio file for emergency shutdown effects
- `deploy.sh` - Production deployment script using rsync
- `serve.py` - Local development server for ES6 modules

## Development Commands

```bash
# Serve locally with ES6 module support
./serve.py
# or use the start script (launches server + opens browser)
./start.sh
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

### Key JavaScript Patterns
- **ES6 Modules**: Clean imports/exports for dependency management
- **Event Delegation**: Component selection and schematic interaction
- **Data Attributes**: `data-component` and `data-part` for element mapping
- **Centralized DOM**: All element references initialized once in `dom.js`

### Key Features
- Interactive SVG schematic with hover tooltips and click-to-select
- Real-time telemetry log with automatic updates
- Configuration sliders affecting system status bars
- Keyboard shortcuts (1-6 for components, M for music, I/D/Esc for commands)
- Party Mode toggle with background music and visual effects
- Emergency shutdown with fire extinguisher animation
- Diagnostic mode with system scanning animation

## Development Guidelines

- Whatever you do, always make sure it's "ironman" themed
- Module imports must use relative paths (e.g., `./dom.js`)
- All DOM references should go through `dom.js` to avoid duplication
- Component mappings are centralized in `constants.js`
- State flags are centralized in `state.js`
- Each module should have a single, clear responsibility

## Important Development Notes

- ES6 modules require a web server (use `./serve.py` for local development)
- Components are identified by `data-component` and `data-part` attributes
- Telemetry system has a 20-entry limit and auto-rotates old messages
- All animations are CSS-based and triggered via JavaScript class manipulation
- Circular dependencies between modules should be avoided
- The deployment script syncs the `js/` folder to production