import { notFound } from "next/navigation";
import { findUserByUsername, readUserConfig } from "@/lib/data";
import type { SiteConfig } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ username: string }>;
}

export default async function ShowcasePage({ params }: Props) {
  const { username } = await params;

  let config: SiteConfig | null = null;
  try {
    const user = await findUserByUsername(username);
    if (!user) notFound();
    config = await readUserConfig(username);
  } catch {
    notFound();
  }

  if (!config) notFound();

  const enabledLinks = config.links.filter((l) => l.enabled);

  return (
    <div className="sc-page">
      {/* Hero section */}
      <div className="sc-hero">
        {config.profile.picture && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={config.profile.picture}
            alt={config.profile.name}
            className="sc-hero-bg"
          />
        )}
        <div className="sc-hero-overlay" />
        <div className="sc-hero-content">
          <div className="sc-name">{config.profile.name}</div>
          {config.profile.subtitle && (
            <div className="sc-handle">{config.profile.subtitle}</div>
          )}
          {enabledLinks.length > 0 && (
            <div className="sc-social-row">
              {enabledLinks.slice(0, 6).map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sc-social-btn"
                  title={link.label}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={link.icon} alt={link.label} />
                </a>
              ))}
            </div>
          )}
          <p className="sc-cta">Check my links</p>
        </div>
      </div>

      {/* Links grid */}
      {enabledLinks.length > 0 && (
        <div className="sc-links">
          {enabledLinks.map((link, idx) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`sc-link-card${idx === 0 ? " sc-link-card-full" : ""}`}
            >
              {link.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={link.photo} alt={link.label} className="sc-card-img" />
              ) : (
                <div className="sc-card-no-photo" />
              )}
              <div className="sc-card-overlay" />
              <div className="sc-card-icon">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={link.icon} alt={link.label} />
              </div>
              <div className="sc-card-label">{link.label}</div>
            </a>
          ))}
        </div>
      )}

      {config.settings.footerText && (
        <div className="sc-footer">{config.settings.footerText}</div>
      )}
    </div>
  );
}
