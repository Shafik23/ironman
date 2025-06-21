// DOM element references
const componentItems = document.querySelectorAll('.component-item');
const schematicParts = document.querySelectorAll('.schematic-part');
const tooltip = document.getElementById('tooltip');
const telemetryLog = document.getElementById('telemetryLog');
const musicToggle = document.getElementById('musicToggle');
const backgroundMusic = document.getElementById('backgroundMusic');

// Configuration sliders
const powerSlider = document.getElementById('powerSlider');
const sensitivitySlider = document.getElementById('sensitivitySlider');
const targetingSlider = document.getElementById('targetingSlider');
const powerValue = document.getElementById('powerValue');
const sensitivityValue = document.getElementById('sensitivityValue');
const targetingValue = document.getElementById('targetingValue');

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

// Telemetry messages for random updates
const telemetryMessages = [
    'Arc reactor stabilization complete',
    'Repulsor array recalibration in progress',
    'Flight system diagnostics passed',
    'Helmet HUD refresh rate optimized',
    'Servo motor response time improved',
    'Power distribution rebalanced',
    'Targeting system accuracy enhanced',
    'Life support systems nominal',
    'Communication array signal boosted',
    'Structural integrity verified',
    'Thermal regulation optimized',
    'Emergency protocols updated',
    'Navigation system calibrated',
    'Weapons systems armed',
    'Defensive countermeasures ready'
];

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
        addTelemetryEntry(`Power output adjusted to ${e.target.value}%`);
    });
    
    sensitivitySlider.addEventListener('input', (e) => {
        sensitivityValue.textContent = e.target.value + '%';
        addTelemetryEntry(`Sensitivity calibrated to ${e.target.value}%`);
    });
    
    targetingSlider.addEventListener('input', (e) => {
        targetingValue.textContent = e.target.value + '%';
        addTelemetryEntry(`Targeting precision set to ${e.target.value}%`);
    });
}

// Update progress bars based on configuration
function updateProgressBars() {
    const powerLevel = parseInt(powerSlider.value);
    const progressBars = document.querySelectorAll('.progress-fill');
    
    // Simulate system load changes based on power level
    if (progressBars.length >= 4) {
        progressBars[0].style.width = Math.min(powerLevel + 10, 100) + '%'; // CPU Load
        progressBars[1].style.width = Math.min(powerLevel * 0.6, 100) + '%'; // Memory
        progressBars[2].style.width = Math.max(powerLevel - 5, 10) + '%'; // Power
        progressBars[3].style.width = Math.min(powerLevel + 5, 100) + '%'; // Integrity
    }
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
            
            // Add telemetry entry based on button clicked
            switch(buttonText) {
                case 'INITIALIZE SYSTEMS':
                    addTelemetryEntry('System initialization sequence started');
                    setTimeout(() => addTelemetryEntry('All systems initialized successfully'), 2000);
                    break;
                case 'RUN DIAGNOSTICS':
                    addTelemetryEntry('Comprehensive diagnostics running...');
                    setTimeout(() => addTelemetryEntry('Diagnostics complete - All systems nominal'), 3000);
                    break;
                case 'EMERGENCY SHUTDOWN':
                    addTelemetryEntry('EMERGENCY SHUTDOWN PROTOCOL ACTIVATED');
                    setTimeout(() => addTelemetryEntry('Non-critical systems powered down'), 1500);
                    break;
            }
        });
    });
}

// Music toggle functionality
function setupMusicToggle() {
    musicToggle.addEventListener('click', () => {
        if (isMusicPlaying) {
            backgroundMusic.pause();
            musicToggle.textContent = 'Music: OFF';
            musicToggle.classList.remove('active');
            isMusicPlaying = false;
            addTelemetryEntry('Background audio disabled');
        } else {
            // Try to play music
            backgroundMusic.play().then(() => {
                musicToggle.textContent = 'Music: ON';
                musicToggle.classList.add('active');
                isMusicPlaying = true;
                addTelemetryEntry('Background audio enabled');
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
    setInterval(() => {
        const randomMessage = telemetryMessages[Math.floor(Math.random() * telemetryMessages.length)];
        addTelemetryEntry(randomMessage);
    }, 8000); // Update every 8 seconds
    
    // System status updates
    setInterval(() => {
        updateSystemMetrics();
    }, 5000); // Update every 5 seconds
}

// Update system metrics randomly
function updateSystemMetrics() {
    const progressBars = document.querySelectorAll('.progress-fill');
    const statusTexts = document.querySelectorAll('.status-row span:last-child');
    
    progressBars.forEach((bar, index) => {
        if (index < statusTexts.length) {
            const currentValue = parseInt(statusTexts[index].textContent);
            const variation = Math.floor(Math.random() * 6) - 3; // -3 to +3
            const newValue = Math.max(10, Math.min(100, currentValue + variation));
            
            bar.style.width = newValue + '%';
            statusTexts[index].textContent = newValue + '%';
        }
    });
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