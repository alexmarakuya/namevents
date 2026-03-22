import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ENTITY_LABELS, ENTITY_BG_CLASSES, FORMAT_LABELS } from "@/lib/utils";

interface Props {
  params: Promise<{ token: string }>;
}

/* ── helpers ── */

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function dateRange(start: Date | null, end: Date | null): string {
  if (!start) return "";
  const datePart = fmtDate(start);
  const startTime = fmtTime(start);

  if (!end) return `${datePart}, ${startTime}`;

  // Same day — show "Fri, Mar 20 · 10:00 AM – 12:30 PM"
  if (start.toDateString() === end.toDateString()) {
    return `${datePart} · ${startTime} – ${fmtTime(end)}`;
  }
  // Different days
  return `${datePart}, ${startTime} — ${fmtDate(end)}, ${fmtTime(end)}`;
}

/* ── metadata ── */

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const event = await prisma.event.findUnique({
    where: { shareToken: token },
    include: { venue: true },
  });

  if (!event) return { title: "Event Not Found" };

  const title = event.title;
  const description = event.shortBlurb || event.description?.slice(0, 160) || `${ENTITY_LABELS[event.entity]} event`;
  const dateStr = event.date ? fmtDate(event.date) : null;
  const location = event.venue?.name || event.location;
  const subtitle = [dateStr, location].filter(Boolean).join(" · ");
  const fullDescription = subtitle ? `${subtitle} — ${description}` : description;

  return {
    title: `${title} — NāM`,
    description: fullDescription,
    openGraph: {
      title,
      description: fullDescription,
      type: "website",
      ...(event.coverImage ? { images: [{ url: event.coverImage, width: 1200, height: 630, alt: title }] } : {}),
    },
    twitter: {
      card: event.coverImage ? "summary_large_image" : "summary",
      title,
      description: fullDescription,
      ...(event.coverImage ? { images: [event.coverImage] } : {}),
    },
  };
}

/* ── page ── */

export default async function PreviewPage({ params }: Props) {
  const { token } = await params;

  const event = await prisma.event.findUnique({
    where: { shareToken: token },
    include: {
      venue: true,
      people: { include: { person: true }, orderBy: { order: "asc" } },
    },
  });

  if (!event) notFound();

  const dateDisplay = dateRange(event.date, event.endDate);
  const locationName = event.venue?.name || event.location;
  const mapsUrl = event.venue?.mapsUrl || event.locationUrl;
  const hosts = event.people.filter((ep) => ep.role === "HOST");
  const speakers = event.people.filter((ep) => ep.role === "SPEAKER");
  const hasRegistration = !!event.registrationUrl;

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Draft banner */}
      {!event.public && (
        <div className="bg-accent-soft/50 border-b border-accent/10 px-6 py-2.5 text-center">
          <p className="text-xs tracking-wide text-accent font-medium uppercase">
            Preview · Not yet published
          </p>
        </div>
      )}

      {/* Top bar with NāM logo */}
      <header className="max-w-2xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
        <svg viewBox="0 0 74.5549 28.0001" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-auto text-accent" aria-label="NāM">
          <path d="M55.7424 27.5041V0.688065H60.528L65.1074 16.1176L69.6455 0.688065H74.5549V27.5041H71.0069V5.96876L66.2213 22.1409H63.8697L59.0841 5.96876V27.5041H55.7424Z" fill="currentColor" />
          <path d="M35.1528 28.0001C32.7875 28.0001 30.9447 27.45 29.6246 26.3499C28.3319 25.2497 27.6855 23.7233 27.6855 21.7705C27.6855 19.9003 28.3044 18.4701 29.542 17.4799C30.7797 16.4898 32.6087 15.9948 35.029 15.9948H41.9599V15.3759C41.9599 13.7257 41.5749 12.5568 40.8048 11.8692C40.0347 11.1816 38.7283 10.8378 36.8855 10.8378C34.3827 10.8378 32.0861 11.4154 29.9959 12.5705L28.8407 9.47639C31.2885 8.18372 34.0664 7.53738 37.1743 7.53738C40.1172 7.53738 42.2625 8.14246 43.6102 9.35262C44.9853 10.5353 45.6729 12.4055 45.6729 14.9634V27.505H42.9088L42.4963 25.6073C41.3961 26.4049 40.241 27.01 39.0308 27.4225C37.8206 27.8076 36.528 28.0001 35.1528 28.0001ZM35.8129 24.6584C38.1232 24.6584 40.1722 24.0533 41.9599 22.8432V19.0477H35.1528C33.8876 19.0477 32.9525 19.2677 32.3474 19.7077C31.7698 20.1478 31.4811 20.8079 31.4811 21.688C31.4811 22.6781 31.8386 23.4207 32.5537 23.9158C33.2688 24.4109 34.3552 24.6584 35.8129 24.6584Z" fill="currentColor" />
          <path d="M0 27.5039V0.687879H4.5381L14.5632 20.4905V0.687879H18.0699V27.5039H14.3156L3.50672 6.1336V27.5039H0Z" fill="currentColor" />
          <path d="M43.8274 2.67029e-05V2.75039H30.0756V2.67029e-05H43.8274Z" fill="currentColor" />
        </svg>
        <span className="text-xs text-text-muted font-mono tracking-wider uppercase">Events</span>
      </header>

      <main className="max-w-2xl mx-auto px-6 pb-16">
        {/* Cover image */}
        {event.coverImage && (
          <div className="rounded-2xl overflow-hidden mb-8 aspect-[2/1]">
            <img
              src={event.coverImage}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Entity badge + format */}
        <div className="flex items-center gap-2.5 mb-5">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-white/90 ${ENTITY_BG_CLASSES[event.entity]}`}
          >
            {ENTITY_LABELS[event.entity]}
          </span>
          <span className="text-xs text-text-muted font-mono">
            {FORMAT_LABELS[event.format]}
          </span>
        </div>

        {/* Title */}
        <h1 className="font-display text-[28px] sm:text-[34px] font-bold text-text-primary leading-[1.15] mb-6">
          {event.title}
        </h1>

        {/* Info card — date, location, capacity */}
        <div className="rounded-2xl border border-border bg-bg-card p-5 mb-8 space-y-3">
          {dateDisplay && (
            <div className="flex items-center gap-3 text-text-primary">
              <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-sm font-medium">{dateDisplay}</span>
            </div>
          )}

          {locationName && (
            <div className="flex items-center gap-3 text-text-primary">
              <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                {mapsUrl ? (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-accent transition-colors underline underline-offset-2 decoration-border hover:decoration-accent">
                    {locationName}
                  </a>
                ) : (
                  <span className="text-sm font-medium">{locationName}</span>
                )}
                {event.venue?.directions && (
                  <p className="text-xs text-text-muted mt-0.5">{event.venue.directions}</p>
                )}
              </div>
            </div>
          )}

          {event.capacity && (
            <div className="flex items-center gap-3 text-text-secondary">
              <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128H5.228A2 2 0 013 17.208V17.128a4.002 4.002 0 014-4h1a4 4 0 014 4v.128M12 10.5a3 3 0 11-6 0 3 3 0 016 0zm6-3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <span className="text-sm">{event.capacity} spots</span>
            </div>
          )}

          {event.price && (
            <div className="flex items-center gap-3 text-text-secondary">
              <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-text-secondary">฿</span>
              </div>
              <span className="text-sm">{event.price}</span>
            </div>
          )}
        </div>

        {/* CTA buttons — before description for mobile */}
        {(hasRegistration || event.externalUrl) && (
          <div className="flex gap-3 mb-10">
            {hasRegistration && (
              <a
                href={event.registrationUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none rounded-2xl bg-accent hover:bg-accent-hover text-white text-center font-semibold py-3 px-8 transition-colors text-sm"
              >
                Register
              </a>
            )}
            {event.externalUrl && (
              <a
                href={event.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${hasRegistration ? "" : "flex-1 sm:flex-none"} rounded-2xl border border-border hover:border-accent text-text-secondary hover:text-accent text-center py-3 px-8 transition-colors text-sm`}
              >
                More Info
              </a>
            )}
          </div>
        )}

        {/* Blurb */}
        {event.shortBlurb && (
          <p className="text-base text-text-secondary leading-relaxed mb-6 italic border-l-2 border-accent/30 pl-4">
            {event.shortBlurb}
          </p>
        )}

        {/* Description */}
        {event.description && (
          <div className="mb-8">
            {event.description.split("\n").filter(Boolean).map((paragraph, i) => (
              <p key={i} className="text-[15px] text-text-primary/85 leading-relaxed mb-4 last:mb-0">
                {paragraph}
              </p>
            ))}
          </div>
        )}

        {/* Hosts & Speakers */}
        {(hosts.length > 0 || speakers.length > 0) && (
          <div className="rounded-2xl border border-border bg-bg-card p-5 mb-8">
            {hosts.length > 0 && (
              <div className={speakers.length > 0 ? "mb-4 pb-4 border-b border-border-subtle" : ""}>
                <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-3">
                  {hosts.length === 1 ? "Host" : "Hosts"}
                </p>
                <div className="space-y-2.5">
                  {hosts.map((ep) => (
                    <div key={ep.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-semibold text-accent">
                        {ep.person.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">{ep.person.name}</p>
                        {ep.customTitle && <p className="text-xs text-text-muted">{ep.customTitle}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {speakers.length > 0 && (
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-3">
                  {speakers.length === 1 ? "Speaker" : "Speakers"}
                </p>
                <div className="space-y-2.5">
                  {speakers.map((ep) => (
                    <div key={ep.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-semibold text-accent">
                        {ep.person.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">{ep.person.name}</p>
                        {ep.customTitle && <p className="text-xs text-text-muted">{ep.customTitle}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {event.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {event.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border bg-bg-card px-3 py-1 text-xs text-text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Co-hosts */}
        {event.coHosts.length > 0 && (
          <p className="text-xs text-text-muted mb-8">
            Co-hosted with {event.coHosts.join(", ")}
          </p>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-border-subtle flex items-center justify-between">
          <svg viewBox="0 0 74.5549 28.0001" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-auto text-text-muted" aria-label="NāM">
            <path d="M55.7424 27.5041V0.688065H60.528L65.1074 16.1176L69.6455 0.688065H74.5549V27.5041H71.0069V5.96876L66.2213 22.1409H63.8697L59.0841 5.96876V27.5041H55.7424Z" fill="currentColor" />
            <path d="M35.1528 28.0001C32.7875 28.0001 30.9447 27.45 29.6246 26.3499C28.3319 25.2497 27.6855 23.7233 27.6855 21.7705C27.6855 19.9003 28.3044 18.4701 29.542 17.4799C30.7797 16.4898 32.6087 15.9948 35.029 15.9948H41.9599V15.3759C41.9599 13.7257 41.5749 12.5568 40.8048 11.8692C40.0347 11.1816 38.7283 10.8378 36.8855 10.8378C34.3827 10.8378 32.0861 11.4154 29.9959 12.5705L28.8407 9.47639C31.2885 8.18372 34.0664 7.53738 37.1743 7.53738C40.1172 7.53738 42.2625 8.14246 43.6102 9.35262C44.9853 10.5353 45.6729 12.4055 45.6729 14.9634V27.505H42.9088L42.4963 25.6073C41.3961 26.4049 40.241 27.01 39.0308 27.4225C37.8206 27.8076 36.528 28.0001 35.1528 28.0001ZM35.8129 24.6584C38.1232 24.6584 40.1722 24.0533 41.9599 22.8432V19.0477H35.1528C33.8876 19.0477 32.9525 19.2677 32.3474 19.7077C31.7698 20.1478 31.4811 20.8079 31.4811 21.688C31.4811 22.6781 31.8386 23.4207 32.5537 23.9158C33.2688 24.4109 34.3552 24.6584 35.8129 24.6584Z" fill="currentColor" />
            <path d="M0 27.5039V0.687879H4.5381L14.5632 20.4905V0.687879H18.0699V27.5039H14.3156L3.50672 6.1336V27.5039H0Z" fill="currentColor" />
            <path d="M43.8274 2.67029e-05V2.75039H30.0756V2.67029e-05H43.8274Z" fill="currentColor" />
          </svg>
          <span className="text-[11px] text-text-muted font-mono">Koh Phangan, Thailand</span>
        </footer>
      </main>
    </div>
  );
}
