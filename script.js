// DOM element references
const componentItems = document.querySelectorAll('.component-item');
const schematicParts = document.querySelectorAll('.schematic-part');
const tooltip = document.getElementById('tooltip');
const telemetryLog = document.getElementById('telemetryLog');
const musicToggle = document.getElementById('musicToggle');
const backgroundMusic = document.getElementById('backgroundMusic');

// Configuration sliders
const powerSlider = document.getElementById('powerSlider');
const colorSlider = document.getElementById('colorSlider');
const targetingSlider = document.getElementById('targetingSlider');
const zoomSlider = document.getElementById('zoomSlider');
const powerValue = document.getElementById('powerValue');
const colorValue = document.getElementById('colorValue');
const targetingValue = document.getElementById('targetingValue');
const zoomValue = document.getElementById('zoomValue');

// Command buttons
const commandButtons = document.querySelectorAll('.command-btn');

// Component to schematic part mapping
const componentMapping = {
    'helmet': 'helmet',
    'chest': 'chest',
    'arms': 'arms',
    'legs': 'legs',
    'repulsors': 'repulsors',
    'thrusters': 'thrusters'
};

// Tooltip content for schematic parts
const tooltipContent = {
    'helmet': 'HELMET SYSTEMS<br>• HUD Display<br>• Life Support<br>• Communications<br>• Targeting System',
    'chest': 'ARC REACTOR<br>• Power Output: 3.2 TW<br>• Efficiency: 99.7%<br>• Core Temperature: 3000°C<br>• Status: NOMINAL',
    'arms': 'ARM SERVOS<br>• Servo Motors: ONLINE<br>• Strength Amplification: 40x<br>• Response Time: 0.002s<br>• Precision: ±0.1mm',
    'legs': 'LEG ACTUATORS<br>• Hydraulic Pressure: 3000 PSI<br>• Speed Enhancement: 15x<br>• Jump Height: 30m<br>• Stability: CALIBRATING',
    'repulsors': 'REPULSOR ARRAY<br>• Energy Output: 8 GJ<br>• Targeting Accuracy: 99.9%<br>• Charge Time: 0.5s<br>• Range: 500m',
    'thrusters': 'FLIGHT SYSTEMS<br>• Thrust Output: 3000 lbf<br>• Max Speed: Mach 3.2<br>• Altitude Ceiling: 50,000ft<br>• Status: OFFLINE'
};


// Music state
let isMusicPlaying = false;

// Initialize the application
function initializeApp() {
    setupComponentSelection();
    setupSchematicInteraction();
    setupConfigurationSliders();
    setupCommandButtons();
    setupMusicToggle();
    startTelemetryUpdates();
    
    // Initialize Arc Reactor with default power level
    updateArcReactor(powerSlider.value);
    
    // Initialize zoom with default value
    updateSuitZoom(zoomSlider.value);
    
    // Initialize suit color with default value
    updateSuitColor(colorSlider.value);
    
    console.log('Ironman Suit Designer GUI initialized');
}

// Component selection functionality
function setupComponentSelection() {
    componentItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove previous selection
            componentItems.forEach(comp => comp.classList.remove('selected'));
            schematicParts.forEach(part => part.classList.remove('highlighted'));
            
            // Add selection to clicked component
            item.classList.add('selected');
            
            // Highlight corresponding schematic part
            const componentType = item.dataset.component;
            const correspondingPart = document.querySelector(`[data-part="${componentMapping[componentType]}"]`);
            if (correspondingPart) {
                correspondingPart.classList.add('highlighted');
            }
            
            // Add telemetry log entry
            const componentName = item.querySelector('.component-name').textContent;
            addTelemetryEntry(`${componentName} selected for configuration`);
        });
        
        // Add hover effects
        item.addEventListener('mouseenter', () => {
            const componentType = item.dataset.component;
            const correspondingPart = document.querySelector(`[data-part="${componentMapping[componentType]}"]`);
            if (correspondingPart && !correspondingPart.classList.contains('highlighted')) {
                correspondingPart.style.filter = 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.5))';
            }
        });
        
        item.addEventListener('mouseleave', () => {
            const componentType = item.dataset.component;
            const correspondingPart = document.querySelector(`[data-part="${componentMapping[componentType]}"]`);
            if (correspondingPart && !correspondingPart.classList.contains('highlighted')) {
                correspondingPart.style.filter = '';
            }
        });
    });
}

// Schematic interaction functionality
function setupSchematicInteraction() {
    schematicParts.forEach(part => {
        part.addEventListener('mouseenter', (e) => {
            showTooltip(e, part.dataset.part);
        });
        
        part.addEventListener('mousemove', (e) => {
            updateTooltipPosition(e);
        });
        
        part.addEventListener('mouseleave', () => {
            hideTooltip();
        });
        
        part.addEventListener('click', () => {
            // Find and select corresponding component
            const partType = part.dataset.part;
            const componentType = Object.keys(componentMapping).find(key => componentMapping[key] === partType);
            if (componentType) {
                const correspondingComponent = document.querySelector(`[data-component="${componentType}"]`);
                if (correspondingComponent) {
                    correspondingComponent.click();
                }
            }
        });
    });
}

// Tooltip functionality
function showTooltip(event, partType) {
    tooltip.innerHTML = tooltipContent[partType] || 'Unknown Component';
    tooltip.classList.add('visible');
    updateTooltipPosition(event);
}

function updateTooltipPosition(event) {
    const rect = event.currentTarget.closest('.schematic-container').getBoundingClientRect();
    tooltip.style.left = (event.clientX - rect.left + 10) + 'px';
    tooltip.style.top = (event.clientY - rect.top - 10) + 'px';
}

function hideTooltip() {
    tooltip.classList.remove('visible');
}

// Configuration sliders functionality
function setupConfigurationSliders() {
    powerSlider.addEventListener('input', (e) => {
        powerValue.textContent = e.target.value + '%';
        updateProgressBars();
        updateArcReactor(e.target.value);
        addTelemetryEntry(`Power output adjusted to ${e.target.value}%`);
    });
    
    colorSlider.addEventListener('input', (e) => {
        colorValue.textContent = e.target.value + '%';
        updateSuitColor(e.target.value);
        addTelemetryEntry(`Suit color adjusted to ${e.target.value}%`);
    });
    
    targetingSlider.addEventListener('input', (e) => {
        targetingValue.textContent = e.target.value + '%';
        addTelemetryEntry(`Targeting precision set to ${e.target.value}%`);
    });
    
    zoomSlider.addEventListener('input', (e) => {
        zoomValue.textContent = e.target.value + '%';
        updateSuitZoom(e.target.value);
        addTelemetryEntry(`Suit schematic zoom adjusted to ${e.target.value}%`);
    });
}

// Update progress bars based on configuration
function updateProgressBars() {
    const powerLevel = parseInt(powerSlider.value);
    const progressBars = document.querySelectorAll('.progress-fill');
    const statusTexts = document.querySelectorAll('.status-row span:last-child');
    
    // Calculate values based on power level
    const cpuLoad = Math.min(powerLevel + 10, 100);
    const memory = Math.min(powerLevel * 0.6, 100);
    const power = powerLevel; // Direct match with Power Output slider
    const integrity = Math.min(powerLevel + 5, 100);
    
    const values = [cpuLoad, memory, power, integrity];
    
    // Update both bars and text values
    if (progressBars.length >= 4 && statusTexts.length >= 4) {
        for (let i = 0; i < 4; i++) {
            progressBars[i].style.width = values[i] + '%';
            statusTexts[i].textContent = Math.round(values[i]) + '%';
        }
    }
}

// Update suit zoom based on slider value
function updateSuitZoom(zoomValue) {
    const suitSchematic = document.querySelector('.suit-schematic');
    
    // Suit boundaries: left edge ~85, right edge ~315, top ~45, bottom ~415
    const suitBounds = { 
        left: 85, 
        right: 315, 
        top: 45, 
        bottom: 415 
    };
    
    const suitWidth = suitBounds.right - suitBounds.left;
    const suitHeight = suitBounds.bottom - suitBounds.top;
    const suitCenterX = (suitBounds.left + suitBounds.right) / 2;
    const suitCenterY = (suitBounds.top + suitBounds.bottom) / 2;
    
    // Calculate zoom factor (100% = 0.8 for more zoomed out default, higher = more zoomed in)
    const zoomFactor = (zoomValue / 100) * 0.8;
    
    // Calculate viewBox dimensions based on zoom
    const viewWidth = suitWidth / zoomFactor;
    const viewHeight = suitHeight / zoomFactor;
    
    // Center the viewBox on the suit
    const viewX = suitCenterX - viewWidth / 2;
    const viewY = suitCenterY - viewHeight / 2;
    
    // Update the viewBox
    suitSchematic.setAttribute('viewBox', `${viewX} ${viewY} ${viewWidth} ${viewHeight}`);
}

// Update Arc Reactor appearance and tooltip based on power level
function updateArcReactor(powerLevel) {
    const reactor = document.querySelector('.reactor');
    const powerInt = parseInt(powerLevel);
    
    // Remove all power level classes to use dynamic styling
    reactor.classList.remove('power-max', 'power-high', 'power-medium', 'power-low', 'power-critical');
    
    // Calculate smooth color transition based on power level
    const { color, glowIntensity } = calculateReactorColor(powerInt);
    
    // Apply dynamic styles that override CSS animations
    reactor.style.fill = color;
    reactor.style.filter = `drop-shadow(0 0 ${glowIntensity}px ${color})`;
    
    // Create pulsing animation with CSS custom properties
    reactor.style.animation = 'none'; // Stop existing animation
    reactor.style.setProperty('--reactor-color', color);
    reactor.style.setProperty('--reactor-glow', `${glowIntensity}px`);
    reactor.style.animation = 'reactor-pulse-dynamic 1.5s ease-in-out infinite alternate';
    
    // Update tooltip content
    updateReactorTooltip(powerInt);
}

// Calculate smooth color transition for reactor
function calculateReactorColor(powerLevel) {
    let r, g, b, glowIntensity;
    
    if (powerLevel <= 25) {
        // Dark red to red (0-25%)
        const factor = powerLevel / 25;
        r = Math.round(139 + (116 * factor)); // 139 to 255
        g = Math.round(0 + (68 * factor));    // 0 to 68
        b = 0;
        glowIntensity = 3 + (5 * factor);     // 3 to 8
    } else if (powerLevel <= 50) {
        // Red to orange (25-50%)
        const factor = (powerLevel - 25) / 25;
        r = 255;
        g = Math.round(68 + (60 * factor));   // 68 to 128
        b = 0;
        glowIntensity = 8 + (4 * factor);     // 8 to 12
    } else if (powerLevel <= 75) {
        // Orange to gold (50-75%)
        const factor = (powerLevel - 50) / 25;
        r = 255;
        g = Math.round(128 + (87 * factor));  // 128 to 215
        b = Math.round(0 + (0 * factor));     // 0 to 0
        glowIntensity = 12 + (6 * factor);    // 12 to 18
    } else {
        // Gold to bright yellow/white (75-100%)
        const factor = (powerLevel - 75) / 25;
        r = 255;
        g = Math.round(215 + (40 * factor));  // 215 to 255
        b = Math.round(0 + (255 * factor));   // 0 to 255
        glowIntensity = 18 + (12 * factor);   // 18 to 30
    }
    
    const color = `rgb(${r}, ${g}, ${b})`;
    return { color, glowIntensity };
}

// Update suit color based on slider value
function updateSuitColor(colorValue) {
    const colorInt = parseInt(colorValue);
    
    // Generate color based on slider value (0-100)
    const { color, glowColor } = calculateFrameColor(colorInt);
    
    // Update CSS custom properties for suit only (not UI frame)
    document.documentElement.style.setProperty('--suit-cyan', color);
    document.documentElement.style.setProperty('--suit-glow', `0 0 8px ${glowColor}`);
    // Note: --primary-cyan remains unchanged to keep UI frame color constant
}

// Calculate frame color based on slider value
function calculateFrameColor(colorValue) {
    let r, g, b;
    
    if (colorValue <= 14) {
        // Cyan to Blue (0-14%)
        const factor = colorValue / 14;
        r = 0;
        g = Math.round(255 - (175 * factor)); // 255 to 80
        b = 255;
    } else if (colorValue <= 28) {
        // Blue to Purple (14-28%)
        const factor = (colorValue - 14) / 14;
        r = Math.round(0 + (128 * factor)); // 0 to 128
        g = Math.round(80 - (80 * factor)); // 80 to 0
        b = 255;
    } else if (colorValue <= 42) {
        // Purple to Magenta (28-42%)
        const factor = (colorValue - 28) / 14;
        r = Math.round(128 + (127 * factor)); // 128 to 255
        g = 0;
        b = 255;
    } else if (colorValue <= 57) {
        // Magenta to Red (42-57%)
        const factor = (colorValue - 42) / 15;
        r = 255;
        g = 0;
        b = Math.round(255 - (255 * factor)); // 255 to 0
    } else if (colorValue <= 71) {
        // Red to Orange (57-71%)
        const factor = (colorValue - 57) / 14;
        r = 255;
        g = Math.round(0 + (165 * factor)); // 0 to 165
        b = 0;
    } else if (colorValue <= 85) {
        // Orange to Yellow (71-85%)
        const factor = (colorValue - 71) / 14;
        r = 255;
        g = Math.round(165 + (90 * factor)); // 165 to 255
        b = 0;
    } else {
        // Yellow to Green (85-100%)
        const factor = (colorValue - 85) / 15;
        r = Math.round(255 - (255 * factor)); // 255 to 0
        g = 255;
        b = Math.round(0 + (128 * factor)); // 0 to 128 (lime green)
    }
    
    const color = `rgb(${r}, ${g}, ${b})`;
    const glowColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
    
    return { color, glowColor };
}

// Continue updateArcReactor function - update tooltip content
function updateReactorTooltip(powerInt) {
    const powerOutput = (0.25 + (powerInt * 0.0475)).toFixed(1); // Scale from 0.25 TW to 5.0 TW
    const efficiency = Math.max(40, Math.min(99.9, 40 + (powerInt * 0.599))).toFixed(1); // Scale from 40% to 99.9%
    const temperature = Math.max(1000, Math.min(5000, 1000 + (powerInt * 40))).toFixed(0); // Scale from 1000°C to 5000°C
    
    let status = 'NOMINAL';
    if (powerInt >= 90) status = 'MAXIMUM POWER';
    else if (powerInt >= 70) status = 'HIGH OUTPUT';
    else if (powerInt < 30) status = 'CRITICAL LOW';
    
    tooltipContent['chest'] = `ARC REACTOR<br>• Power Output: ${powerOutput} TW<br>• Efficiency: ${efficiency}%<br>• Core Temperature: ${temperature}°C<br>• Status: ${status}`;
}

// Command buttons functionality
function setupCommandButtons() {
    commandButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const buttonText = e.target.textContent;
            
            // Add visual feedback
            e.target.style.transform = 'scale(0.95)';
            setTimeout(() => {
                e.target.style.transform = '';
            }, 150);
            
            // Add telemetry entry and execute commands based on button clicked
            switch(buttonText) {
                case 'INITIALIZE SYSTEMS':
                    executeInitializeSystems();
                    break;
                case 'RUN DIAGNOSTICS':
                    executeRunDiagnostics();
                    break;
                case 'EMERGENCY SHUTDOWN':
                    executeEmergencyShutdown();
                    break;
            }
        });
    });
}

// Command execution functions
function executeInitializeSystems() {
    addTelemetryEntry('System initialization sequence started');
    addTelemetryEntry('Setting power output to optimal levels...');
    
    // Set Power Output to 70%
    powerSlider.value = 70;
    powerValue.textContent = '70%';
    updateProgressBars();
    updateArcReactor(70);
    
    // Set Zoom to 90%
    zoomSlider.value = 90;
    zoomValue.textContent = '90%';
    updateSuitZoom(90);
    
    setTimeout(() => {
        addTelemetryEntry('Power output stabilized at 70%');
        addTelemetryEntry('Zoom calibration complete');
        addTelemetryEntry('All systems initialized successfully');
    }, 2000);
}

function executeRunDiagnostics() {
    addTelemetryEntry('Comprehensive diagnostics initiated');
    addTelemetryEntry('Scanning all system components...');
    
    // Get current system status elements
    const progressBars = document.querySelectorAll('.progress-fill');
    const statusTexts = document.querySelectorAll('.status-row span:last-child');
    const suitSchematic = document.querySelector('.suit-schematic');
    
    // Store original values for CPU and Memory
    const originalCpuWidth = progressBars[0].style.width;
    const originalMemoryWidth = progressBars[1].style.width;
    const originalCpuText = statusTexts[0].textContent;
    const originalMemoryText = statusTexts[1].textContent;
    
    // Boost CPU and Memory to 100%
    progressBars[0].style.width = '100%';
    progressBars[1].style.width = '100%';
    statusTexts[0].textContent = '100%';
    statusTexts[1].textContent = '100%';
    
    // Add diagnostic animation to body
    suitSchematic.classList.add('diagnostic-scan');
    
    addTelemetryEntry('CPU and Memory boosted for intensive scanning');
    addTelemetryEntry('Deep system analysis in progress...');
    
    // End diagnostics after 25 seconds
    setTimeout(() => {
        // Restore original CPU and Memory values
        progressBars[0].style.width = originalCpuWidth;
        progressBars[1].style.width = originalMemoryWidth;
        statusTexts[0].textContent = originalCpuText;
        statusTexts[1].textContent = originalMemoryText;
        
        // Remove diagnostic animation
        suitSchematic.classList.remove('diagnostic-scan');
        
        addTelemetryEntry('Diagnostic scan complete');
        addTelemetryEntry('CPU and Memory restored to normal levels');
        addTelemetryEntry('All systems nominal - No issues detected');
    }, 25000);
}

function executeEmergencyShutdown() {
    addTelemetryEntry('EMERGENCY SHUTDOWN PROTOCOL ACTIVATED');
    addTelemetryEntry('Initiating emergency power down sequence...');
    
    // Set Power Output to 0%
    powerSlider.value = 0;
    powerValue.textContent = '0%';
    updateProgressBars();
    updateArcReactor(0);
    
    // Stop music and dancing animation
    if (isMusicPlaying) {
        backgroundMusic.pause();
        musicToggle.textContent = 'Music: OFF';
        musicToggle.classList.remove('active');
        isMusicPlaying = false;
        document.querySelector('.suit-schematic').classList.remove('dancing');
        addTelemetryEntry('Background audio systems disabled');
    }
    
    setTimeout(() => {
        addTelemetryEntry('Power output reduced to minimum safe levels');
        addTelemetryEntry('Non-critical systems powered down');
        addTelemetryEntry('Emergency shutdown complete - Manual restart required');
    }, 1500);
}

// Music toggle functionality
function setupMusicToggle() {
    const suitSchematic = document.querySelector('.suit-schematic');
    
    musicToggle.addEventListener('click', () => {
        if (isMusicPlaying) {
            backgroundMusic.pause();
            musicToggle.textContent = 'Music: OFF';
            musicToggle.classList.remove('active');
            isMusicPlaying = false;
            // Stop dancing animation
            suitSchematic.classList.remove('dancing');
            addTelemetryEntry('Background audio disabled - Dance mode OFF');
        } else {
            // Try to play music
            backgroundMusic.play().then(() => {
                musicToggle.textContent = 'Music: ON';
                musicToggle.classList.add('active');
                isMusicPlaying = true;
                // Start dancing animation
                suitSchematic.classList.add('dancing');
                addTelemetryEntry('Background audio enabled - IRON MAN DANCE MODE ACTIVATED');
            }).catch((error) => {
                // Handle autoplay restrictions
                console.log('Audio autoplay prevented:', error);
                addTelemetryEntry('Audio source unavailable - check connection');
                isMusicPlaying = false;
            });
        }
    });
    
    // Handle audio events
    backgroundMusic.addEventListener('ended', () => {
        // Audio ended (though it should loop)
        isMusicPlaying = false;
        musicToggle.textContent = 'Music: OFF';
        musicToggle.classList.remove('active');
        suitSchematic.classList.remove('dancing');
    });
    
    backgroundMusic.addEventListener('error', (e) => {
        console.log('Audio error:', e);
        addTelemetryEntry('Audio playback error - check audio source');
    });
}

// Telemetry system
function addTelemetryEntry(message) {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `[${timestamp}] ${message}`;
    
    // Add to top of log
    telemetryLog.insertBefore(entry, telemetryLog.firstChild);
    
    // Limit log entries to prevent overflow
    const entries = telemetryLog.querySelectorAll('.log-entry');
    if (entries.length > 20) {
        entries[entries.length - 1].remove();
    }
    
    // Trigger animation
    setTimeout(() => {
        entry.style.opacity = '1';
    }, 50);
}

// Auto-updating telemetry
function startTelemetryUpdates() {
    // Removed random telemetry messages - telemetry now only shows user-triggered events
}


// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
            const index = parseInt(e.key) - 1;
            if (componentItems[index]) {
                componentItems[index].click();
            }
            break;
        case 'm':
        case 'M':
            musicToggle.click();
            break;
        case 'i':
        case 'I':
            commandButtons[0].click(); // Initialize
            break;
        case 'd':
        case 'D':
            commandButtons[1].click(); // Diagnostics
            break;
        case 'Escape':
            commandButtons[2].click(); // Emergency shutdown
            break;
    }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Handle window resize for responsive tooltip positioning
window.addEventListener('resize', () => {
    hideTooltip();
});

// Add some startup telemetry entries
setTimeout(() => {
    addTelemetryEntry('Ironman Suit Designer GUI v2.1 loaded');
    addTelemetryEntry('All interface modules initialized');
    addTelemetryEntry('Ready for suit configuration');
}, 1000);