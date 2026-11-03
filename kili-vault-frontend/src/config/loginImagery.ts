import type { UserRole } from '@/types';

export interface LoginSlide {
  id: string;
  src: string;
  alt: string;
  kicker: string;
  title: string;
  role?: UserRole;
}

export const LOGIN_HERO_SLIDES: LoginSlide[] = [
  {
    id: 'satellite',
    src: '/images/login/hero-satellite.jpg',
    alt: 'Earth viewed from orbit with city lights',
    kicker: 'Kili-Shadows',
    title: 'Satellite change detection across Kilimani Ward',
  },
  {
    id: 'nairobi',
    src: '/images/login/nairobi-aerial.jpg',
    alt: 'Aerial view of urban buildings and streets',
    kicker: 'Kilimani Ward',
    title: '2.4 km² of ward-scale spatial accountability',
  },
  {
    id: 'planner',
    src: '/images/login/role-planner.jpg',
    alt: 'City map with location pins on a table',
    kicker: 'Planner',
    title: 'Map-first oversight and human review',
    role: 'planner',
  },
  {
    id: 'developer',
    src: '/images/login/role-developer.jpg',
    alt: 'Construction site with cranes and scaffolding',
    kicker: 'Developer',
    title: 'Respond with geotagged evidence on site',
    role: 'developer',
  },
  {
    id: 'community',
    src: '/images/login/role-community.jpg',
    alt: 'Modern urban skyline with glass towers',
    kicker: 'Community',
    title: 'Neighbourhood observations on the map',
    role: 'community',
  },
  {
    id: 'agency',
    src: '/images/login/role-agency.jpg',
    alt: 'Bright modern office workspace',
    kicker: 'Agency',
    title: 'Authoritative verification and sign-off',
    role: 'agency',
  },
];

export const ROLE_IMAGES: Record<UserRole, { src: string; alt: string }> = {
  planner: { src: '/images/login/role-planner.jpg', alt: 'Map planning workspace' },
  developer: { src: '/images/login/role-developer.jpg', alt: 'Active construction site' },
  community: { src: '/images/login/role-community.jpg', alt: 'Urban neighbourhood skyline' },
  agency: { src: '/images/login/role-agency.jpg', alt: 'Agency verification office' },
};

export function slideForRole(role: UserRole | null): LoginSlide {
  if (role) {
    return LOGIN_HERO_SLIDES.find((s) => s.role === role) ?? LOGIN_HERO_SLIDES[0];
  }
  return LOGIN_HERO_SLIDES[0];
}
