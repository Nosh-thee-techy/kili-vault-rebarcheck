import type { AuthUser, UserRole } from '@/types';

export interface DemoUser extends AuthUser {
  description: string;
  homePath: string;
}

export const DEMO_USERS: Record<UserRole, DemoUser> = {
  planner: {
    id: 'planner_001',
    name: 'Grace Wanjiku',
    role: 'planner',
    title: 'Governance Officer · Planner',
    description: 'Review AI flags, assess compliance, require mitigation, close cases.',
    homePath: '/planner',
  },
  developer: {
    id: 'dev_kilimani_001',
    name: 'James Ochieng',
    role: 'developer',
    title: 'Developer',
    description: 'View assigned cases, upload evidence, track verification status.',
    homePath: '/developer',
  },
  community: {
    id: 'community_001',
    name: 'Amina Hassan',
    role: 'community',
    title: 'Resident',
    description: 'View public developments and submit spatial observations.',
    homePath: '/community',
  },
  agency: {
    id: 'ncwsc_verifier',
    name: 'NCWSC Inspector',
    role: 'agency',
    title: 'Agency Verifier',
    description: 'Review evidence packs and return verification decisions.',
    homePath: '/agency',
  },
};
