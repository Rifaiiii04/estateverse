import type { Href } from 'expo-router';

// Typed route builders so screens never hand-write URL strings.
export const routes = {
  home: '/' as Href,
  properties: '/properties' as Href,
  login: '/login' as Href,
  register: '/register' as Href,
  listings: '/dashboard/listings' as Href,
  leads: '/dashboard/leads' as Href,
  propertyDetail: (slug: string): Href => ({ pathname: '/property/[slug]', params: { slug } }),
  propertyTour: (slug: string): Href => ({ pathname: '/property/tour', params: { slug } }),
  propertySearch: (q: string): Href => ({ pathname: '/properties', params: { q } }),
  propertyForm: (id?: number): Href =>
    id === undefined
      ? { pathname: '/dashboard/form' }
      : { pathname: '/dashboard/form', params: { id: String(id) } },
};
