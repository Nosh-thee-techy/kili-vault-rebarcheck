export const FEATURES = {
  communityObservations: import.meta.env.VITE_ENABLE_COMMUNITY !== 'false',
  agencyVerification: true,
  mapSatelliteToggle: true,
  caseTableView: true,
} as const;
