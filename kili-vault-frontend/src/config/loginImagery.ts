import type { UserRole } from '@/types';

export const ROLE_IMAGES: Record<UserRole, { src: string; alt: string }> = {
  planner: { src: '/images/login/role-planner.jpg', alt: 'Planner reviewing a map workspace' },
  developer: { src: '/images/login/role-developer.jpg', alt: 'Urban construction site' },
  community: { src: '/images/login/role-community.jpg', alt: 'Kilimani neighbourhood skyline' },
  agency: { src: '/images/login/role-agency.jpg', alt: 'Agency review workspace' },
};
