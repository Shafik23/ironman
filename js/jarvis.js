import { state } from './state.js';
import { dom } from './dom.js';
import { addTelemetryEntry } from './telemetry.js';

let synthesis = null;
let recognition = null;
let jarvisActive = false;
let voiceEnabled = false;

const jarvisPhrases = {
  greeting: [
    'Good evening, sir. All systems are operational.',
    'Welcome back, sir. The Mark VII is ready for deployment.',
    'Greetings, sir. Shall I run a systems check?',
    'Online and ready, sir.'
  ],
  initialization: [
    'Initializing all systems.',
    'Running startup sequence.',
    'Systems coming online.',
    'Boot sequence initiated.'
  ],
  diagnostics: [
    'Running full diagnostics sweep.',
    'Analyzing all systems for anomalies.',
    'Comprehensive scan in progress.',
    'Diagnostics mode activated.'
  ],
  emergency: [
    'Emergency shutdown initiated!',
    'Warning: Emergency protocols engaged!',
    'All systems powering down immediately!',
    'Emergency shutdown sequence activated!'
  ],
  componentSelect: {
    helmet: 'Helmet systems activated. HUD online.',
    chest: 'Arc reactor engaged. Power output stable.',
    arms: 'Arm servos online. Weapon systems ready.',
    legs: 'Leg actuators engaged. Mobility systems active.',
    repulsors: 'Repulsor array charged and ready.',
    thrusters: 'Flight systems online. Ready for takeoff.'
  },
  componentDeselect: {
    helmet: 'Helmet systems offline.',
    chest: 'Arc reactor disengaged.',
    arms: 'Arm servos deactivated.',
    legs: 'Leg actuators offline.',
    repulsors: 'Repulsor array powering down.',
    thrusters: 'Flight systems deactivated.'
  },
  powerLevels: {
    critical: 'Warning: Power levels critical.',
    low: 'Power levels below optimal parameters.',
    normal: 'Power levels stable.',
    high: 'Power output exceeding normal parameters.'
  },
  partyMode: {
    on: "Party mode activated. Let's rock and roll, sir!",
    off: 'Party mode deactivated. Returning to normal operations.'
  },
  random: [
    'Systems functioning within normal parameters.',
    'No threats detected in the immediate vicinity.',
    'All systems green across the board.',
    'Shall I compile a threat assessment, sir?',
    'Standing by for your orders.'
  ]
};

export function initializeJarvis() {
  if ('speechSynthesis' in window) {
    synthesis = window.speechSynthesis;
    voiceEnabled = true;
  }

  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = handleVoiceCommand;
    recognition.onerror = event => {
      console.error('Speech recognition error:', event.error);
      if (jarvisActive) {
        startListening();
      }
    };
    recognition.onend = () => {
      if (jarvisActive) {
        setTimeout(startListening, 500);
      }
    };
  }
}

export function speak(text, priority = false) {
  if (!voiceEnabled || !jarvisActive) {
    return;
  }

  if (priority && synthesis?.speaking) {
    synthesis.cancel();
  }

  if (synthesis?.speaking) {
    return; // skip non-priority while speaking
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 0.9;
  utterance.volume = 0.8;

  const voices = synthesis.getVoices();
  const preferredVoice = voices.find(
    voice => voice.name.includes('Daniel') || voice.name.includes('James') || voice.name.includes('Oliver')
  );

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.onstart = () => {
    if (dom.jarvisIndicator) {
      dom.jarvisIndicator.classList.add('speaking');
    }
  };

  utterance.onend = () => {
    if (dom.jarvisIndicator) {
      dom.jarvisIndicator.classList.remove('speaking');
    }
  };

  synthesis.speak(utterance);
}

export function getRandomPhrase(category) {
  const phrases = jarvisPhrases[category];
  if (Array.isArray(phrases)) {
    return phrases[Math.floor(Math.random() * phrases.length)];
  }
  return phrases;
}

export function announceComponentChange(component, selected) {
  const phrases = selected ? jarvisPhrases.componentSelect : jarvisPhrases.componentDeselect;
  const phrase = phrases[component];
  if (phrase) {
    speak(phrase);
  }
}

export function announcePowerLevel(level) {
  let phrase;
  if (level < 20) {
    phrase = jarvisPhrases.powerLevels.critical;
  } else if (level < 50) {
    phrase = jarvisPhrases.powerLevels.low;
  } else if (level < 85) {
    phrase = jarvisPhrases.powerLevels.normal;
  } else {
    phrase = jarvisPhrases.powerLevels.high;
  }
  speak(phrase);
}

export function toggleJarvis() {
  jarvisActive = !jarvisActive;

  if (dom.jarvisToggle) {
    dom.jarvisToggle.textContent = `J.A.R.V.I.S.: ${jarvisActive ? 'ONLINE' : 'OFFLINE'}`;
    dom.jarvisToggle.classList.toggle('active', jarvisActive);
  }

  if (dom.jarvisIndicator) {
    dom.jarvisIndicator.classList.toggle('active', jarvisActive);
  }

  if (jarvisActive) {
    speak(getRandomPhrase('greeting'), true);
    addTelemetryEntry('J.A.R.V.I.S. voice assistant activated');
    if (recognition) {
      startListening();
    }
  } else {
    synthesis?.cancel();
    recognition?.stop();
    addTelemetryEntry('J.A.R.V.I.S. voice assistant deactivated');
  }
}

function startListening() {
  if (recognition && jarvisActive) {
    try {
      recognition.start();
    } catch (e) {
      // Already listening
    }
  }
}

function handleVoiceCommand(event) {
  const command = event.results[0][0].transcript.toLowerCase();
  addTelemetryEntry(`Voice command: "${command}"`);

  if (command.includes('initialize') || command.includes('start')) {
    document.querySelector('.command-btn.primary')?.click();
    speak(getRandomPhrase('initialization'));
  } else if (command.includes('diagnostic') || command.includes('scan')) {
    document.querySelector('.command-btn.secondary')?.click();
    speak(getRandomPhrase('diagnostics'));
  } else if (command.includes('emergency') || command.includes('shutdown')) {
    document.querySelector('.command-btn.danger')?.click();
    speak(jarvisPhrases.emergency[0], true);
  } else if (command.includes('party mode')) {
    dom.musicToggle?.click();
  } else if (command.includes('helmet')) {
    selectComponent('helmet');
  } else if (command.includes('chest') || command.includes('reactor')) {
    selectComponent('chest');
  } else if (command.includes('arm')) {
    selectComponent('arms');
  } else if (command.includes('leg')) {
    selectComponent('legs');
  } else if (command.includes('repulsor')) {
    selectComponent('repulsors');
  } else if (command.includes('thruster') || command.includes('flight')) {
    selectComponent('thrusters');
  } else {
    speak("I didn't quite catch that, sir. Could you repeat?");
  }
}

function selectComponent(componentName) {
  const component = document.querySelector(`[data-component="${componentName}"]`);
  component?.click();
}

export function jarvisAnnounce(message, priority = false) {
  if (jarvisActive) {
    speak(message, priority);
  }
}

export function isJarvisActive() {
  return jarvisActive;
}

export { jarvisPhrases };
