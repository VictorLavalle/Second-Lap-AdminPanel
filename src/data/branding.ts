// Admin panel branding. Config over hard-coding: labels and asset paths live
// here, not scattered through components.
export interface AdminBranding {
  name: string;
  panelTitle: string;
  tagline: string;
  logo: {
    markLight: string;
    markDark: string;
  };
}

export const branding: AdminBranding = {
  name: "Second Lap",
  panelTitle: "Panel de administración",
  tagline: "Gestión de productos y pedidos",
  logo: {
    markLight: "/brand/logo-mark-light-transparent.webp",
    markDark: "/brand/logo-mark-dark-transparent.webp",
  },
};
