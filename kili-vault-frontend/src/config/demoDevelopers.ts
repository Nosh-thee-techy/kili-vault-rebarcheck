export interface DemoDeveloper {
  id: string;
  name: string;
}

/** Demo developers available for mitigation assignment */
export const DEMO_DEVELOPERS: DemoDeveloper[] = [
  { id: 'dev_kilimani_001', name: 'James Ochieng' },
  { id: 'dev_kilimani_002', name: 'Sarah Mwangi' },
];

export const DEFAULT_DEVELOPER_ID = DEMO_DEVELOPERS[0].id;
