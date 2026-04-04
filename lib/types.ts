export interface SiteLink {
  id: string;
  icon: string; // Path like "/instagram_icon.svg" or "/uploads/custom-xyz.png"
  iconType: "preset" | "custom";
  label: string;
  url: string;
  enabled: boolean;
  photo?: string; // Optional image for showcase page card background
  photoAspect?: number; // Width/height ratio from crop (e.g. 1, 1.333, 0.75, 1.778)
}

export interface SiteProfile {
  name: string;
  subtitle: string;
  picture: string;
  pictureAspect?: number; // Width/height ratio from crop
  usePerThemePictures?: boolean;
  perThemePictures?: Record<string, string>;
  perThemePictureAspects?: Record<string, number>;
}

export type ShowcaseLayout = "classic" | "compact" | "immersive";

export type ShowcaseSection = "hero" | "links" | "gallery";

export interface SiteSettings {
  language: "es" | "en";
  footerText: string;
  showcaseLayout?: ShowcaseLayout;
  carouselPhotos?: string[];
  sectionOrder?: ShowcaseSection[];
  toolbarFont?: "gothic" | "elegant" | "clean" | "haute";
  appTheme?: string;
  colorMode?: "light" | "dark" | "auto";
  useGradients?: boolean;
}

export interface SiteConfig {
  profile: SiteProfile;
  links: SiteLink[];
  settings: SiteSettings;
}

export interface PresetIcon {
  id: string;
  name: string;
  path: string;
}

export interface UserRecord {
  email: string;
  username: string;
  displayName: string;
  createdAt: string;
}

export interface UsersRegistry {
  users: UserRecord[];
}
