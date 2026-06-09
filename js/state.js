export const state = {
  isDiagnosticsRunning: false,
  isPartyMode: false,
  partyColorCycleInterval: null,
  partyStatusInterval: null,
  isHudMode: false,
  reactorTooltip: null,
  mission: {
    status: 'idle',
    threats: [],
    neutralized: 0,
    totalThreats: 0,
    timeRemaining: 0,
    timerId: null,
    motionFrame: null,
    lockedThreatId: null
  }
};
