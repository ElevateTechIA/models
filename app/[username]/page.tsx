import Image from "next/image";
import { notFound } from "next/navigation";
import { findUserByUsername, readUserConfig } from "@/lib/data";
import LinksNav from "./links-nav";
import OfflineProfile from "./offline-profile";
import CtaButton from "./cta-button";
import type { SiteConfig } from "@/lib/types";
import { translations } from "@/lib/translations";
import { resolveProfilePicture } from "@/lib/theme/resolve-profile-picture";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ username: string }>;
}

export default async function UserBioPage({ params }: Props) {
  const { username } = await params;

  let config: SiteConfig | null = null;

  try {
    const user = await findUserByUsername(username);
    if (!user) notFound();
    config = await readUserConfig(username);
  } catch {
    // Server-side Firestore failure — render client-only offline fallback
    return <OfflineProfile username={username} serverConfig={null} />;
  }

  const enabledLinks = config.links.filter((l) => l.enabled);
  const { picture: profilePic } = resolveProfilePicture(config.profile, config.settings.appTheme || "gold");

  return (
    <>
      <div className="device-frame">
        <div className="device-notch" />
        <main className="page-wrapper">
          <div className="avatar-ring">
            {profilePic ? (
              <Image
                src={profilePic}
                alt={config.profile.name}
                width={170}
                height={170}
                priority
              />
            ) : (
              <div
                style={{
                  width: 170,
                  height: 170,
                  borderRadius: "50%",
                  background: "#e0d6cc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 64,
                  color: "#8b7355",
                }}
              >
                {config.profile.name.charAt(0)}
              </div>
            )}
            <span className="badge">
              <svg viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </span>
          </div>

          <h2 className="name">{config.profile.name}</h2>
          <p className="subtitle">{config.profile.subtitle}</p>

          <LinksNav links={enabledLinks} />

          {config.settings.footerText && (
            <footer className="footer">{config.settings.footerText}</footer>
          )}

          <div className="cta-container">
            <CtaButton label={translations[config.settings.language || "es"].ctaCreateYours} />
          </div>

        </main>
        <div className="device-home-indicator" />
      </div>

      {/* Client component: caches config to IndexedDB, shows offline badge when needed */}
      <OfflineProfile username={username} serverConfig={config} />
    </>
  );
}
