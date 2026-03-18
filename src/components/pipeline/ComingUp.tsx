"use client";

import Link from "next/link";
import { ENTITY_LABELS, ENTITY_BG_CLASSES, formatDateTime } from "@/lib/utils";
import type { Event } from "@/generated/prisma/client";

interface Props {
  events: Event[];
}

export function ComingUp({ events }: Props) {
  if (events.length === 0) return null;

  return (
    <div className="mb-6 mt-6">
      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
        Coming Up
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="flex-shrink-0 rounded-xl bg-bg-card border border-border hover:border-accent/30 p-4 min-w-[240px] max-w-[280px] transition-all shadow-sm hover:shadow-md"
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`inline-block w-2 h-2 rounded-full ${ENTITY_BG_CLASSES[event.entity]}`}
              />
              <span className="text-xs text-text-muted">
                {ENTITY_LABELS[event.entity]}
              </span>
            </div>
            <p className="font-semibold text-text-primary text-sm leading-tight mb-1 line-clamp-1">
              {event.title}
            </p>
            <p className="text-xs text-accent">
              {formatDateTime(event.date)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
