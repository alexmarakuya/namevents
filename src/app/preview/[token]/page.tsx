import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ENTITY_LABELS, ENTITY_BG_CLASSES, FORMAT_LABELS, formatDateTime } from "@/lib/utils";

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const event = await prisma.event.findUnique({
    where: { shareToken: token },
    include: { venue: true },
  });

  if (!event) return { title: "Event Not Found" };

  const title = event.title;
  const description = event.shortBlurb || event.description?.slice(0, 160) || `${ENTITY_LABELS[event.entity]} event`;
  const dateStr = event.date ? formatDateTime(event.date) : null;
  const location = event.venue?.name || event.location;
  const subtitle = [dateStr, location].filter(Boolean).join(" · ");
  const fullDescription = subtitle ? `${subtitle}\n\n${description}` : description;

  return {
    title,
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

export default async function PreviewPage({ params }: Props) {
  const { token } = await params;

  const event = await prisma.event.findUnique({
    where: { shareToken: token },
    include: { venue: true },
  });

  if (!event) notFound();

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Draft banner */}
      {!event.public && (
        <div className="bg-accent-soft border-b border-accent/20 px-6 py-3 text-center">
          <p className="text-sm text-accent font-medium">
            Preview only — this event hasn&apos;t been published yet
          </p>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-6 py-12">
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

        {/* Entity + format badges */}
        <div className="flex items-center gap-3 mb-4">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white/90 ${ENTITY_BG_CLASSES[event.entity]}`}
          >
            {ENTITY_LABELS[event.entity]}
          </span>
          <span className="text-sm text-text-muted">
            {FORMAT_LABELS[event.format]}
          </span>
        </div>

        {/* Title */}
        <h1 className="font-display text-4xl font-bold text-text-primary leading-tight mb-6">
          {event.title}
        </h1>

        {/* Date & location */}
        <div className="space-y-2 mb-8">
          {event.date && (
            <div className="flex items-center gap-2 text-text-secondary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>
                {formatDateTime(event.date)}
                {event.endDate && ` — ${formatDateTime(event.endDate)}`}
              </span>
            </div>
          )}
          {(event.venue || event.location) && (
            <div className="flex items-start gap-2 text-text-secondary">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                {event.venue ? (
                  <>
                    {event.venue.mapsUrl ? (
                      <a href={event.venue.mapsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
                        {event.venue.name}
                      </a>
                    ) : (
                      <span>{event.venue.name}</span>
                    )}
                    {event.venue.description && (
                      <p className="text-sm text-text-muted mt-0.5">{event.venue.description}</p>
                    )}
                    {event.venue.directions && (
                      <p className="text-xs text-text-muted mt-1">{event.venue.directions}</p>
                    )}
                  </>
                ) : event.locationUrl ? (
                  <a href={event.locationUrl} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
                    {event.location}
                  </a>
                ) : (
                  <span>{event.location}</span>
                )}
              </div>
            </div>
          )}
          {event.capacity && (
            <div className="flex items-center gap-2 text-text-muted text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Capacity: {event.capacity}</span>
            </div>
          )}
        </div>

        {/* Blurb */}
        {event.shortBlurb && (
          <p className="text-lg text-text-secondary leading-relaxed mb-6 italic">
            {event.shortBlurb}
          </p>
        )}

        {/* Description */}
        {event.description && (
          <div className="prose max-w-none mb-8">
            {event.description.split("\n").map((paragraph, i) => (
              <p key={i} className="text-text-primary/90 leading-relaxed mb-4">
                {paragraph}
              </p>
            ))}
          </div>
        )}

        {/* Tags */}
        {event.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {event.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-bg-elevated px-3 py-1 text-xs text-text-secondary"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Co-hosts */}
        {event.coHosts.length > 0 && (
          <p className="text-sm text-text-muted mb-8">
            Co-hosted with {event.coHosts.join(", ")}
          </p>
        )}

        {/* CTA buttons */}
        <div className="flex gap-3">
          {event.registrationUrl && (
            <a
              href={event.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-[10px] bg-accent hover:bg-accent-hover text-white font-semibold py-2.5 px-6 transition-colors"
            >
              Register
            </a>
          )}
          {event.externalUrl && (
            <a
              href={event.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-[10px] border border-border hover:border-accent text-text-secondary hover:text-accent py-2.5 px-6 transition-colors"
            >
              More Info
            </a>
          )}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-6 border-t border-border-subtle">
          <p className="text-xs text-text-muted text-center">
            NāM Events &middot; Koh Phangan, Thailand
          </p>
        </div>
      </main>
    </div>
  );
}
