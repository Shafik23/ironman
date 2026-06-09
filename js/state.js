export const state = {
  partyColorCycleInterval: null,
  partyStatusInterval: null,
  reactorTooltip: null,
  suitSystems: null,
  diagnosticFindings: {},
  diagnosticScanCount: 0,
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
