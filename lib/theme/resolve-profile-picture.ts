import type { SiteProfile } from "@/lib/types";

export function resolveProfilePicture(
  profile: SiteProfile,
  activeTheme: string
): { picture: string; aspect?: number } {
  if (
    profile.usePerThemePictures &&
    profile.perThemePictures?.[activeTheme]
  ) {
    return {
      picture: profile.perThemePictures[activeTheme],
      aspect: profile.perThemePictureAspects?.[activeTheme],
    };
  }
  return { picture: profile.picture, aspect: profile.pictureAspect };
}
