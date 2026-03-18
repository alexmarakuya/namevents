"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ENTITY_LABELS, ENTITY_BG_CLASSES, FORMAT_LABELS, formatDate } from "@/lib/utils";
import type { Event } from "@/generated/prisma/client";

interface Props {
  event: Event;
}

export function EventCard({ event }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: event.id, data: { event } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="rounded-xl bg-bg-card border border-border hover:border-accent/30 cursor-grab active:cursor-grabbing transition-all shadow-sm hover:shadow-md group"
    >
      <Link href={`/events/${event.id}`} className="block p-3.5" onClick={(e) => {
        // Prevent navigation during drag
        if (isDragging) e.preventDefault();
      }}>
        <div className="flex gap-3">
          <div className="flex-1 min-w-0">
            {/* Entity + Format */}
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold text-white/90 ${ENTITY_BG_CLASSES[event.entity]}`}
              >
                {ENTITY_LABELS[event.entity]}
              </span>
              <span className="text-[10px] text-text-muted">
                {FORMAT_LABELS[event.format]}
              </span>
            </div>

            {/* Title */}
            <p className="font-semibold text-sm text-text-primary leading-tight mb-1 line-clamp-2">
              {event.title}
            </p>

            {/* Date */}
            {event.date && (
              <p className="text-xs text-text-secondary">
                {formatDate(event.date)}
              </p>
            )}

            {/* Indicators */}
            <div className="flex items-center gap-2 mt-2">
              {event.public && (
                <span className="text-[10px] text-accent font-medium">Public</span>
              )}
              {event.capacity && (
                <span className="text-[10px] text-text-muted">Cap: {event.capacity}</span>
              )}
            </div>
          </div>

          {/* Cover thumbnail */}
          {event.coverImage && (
            <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-bg-elevated">
              <img
                src={event.coverImage}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
