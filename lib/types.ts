export interface SiteLink {
  id: string;
  icon: string; // Path like "/instagram_icon.svg" or "/uploads/custom-xyz.png"
  iconType: "preset" | "custom";
  label: string;
  url: string;
  enabled: boolean;
}

export interface SiteProfile {
  name: string;
  subtitle: string;
  picture: string;
}

export interface SiteSettings {
  language: "es" | "en";
  footerText: string;
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
