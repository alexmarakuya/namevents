"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { EventCard } from "./EventCard";
import { STAGE_LABELS } from "@/lib/utils";
import type { Event, EventStage } from "@/generated/prisma/client";

interface Props {
  stage: EventStage;
  events: Event[];
}

export function Column({ stage, events }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div className="flex-1 min-w-[260px] max-w-[340px]">
      <div className="flex items-center gap-2 mb-3 px-1">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
          {STAGE_LABELS[stage]}
        </h3>
        <span className="text-xs text-text-secondary bg-bg-surface rounded-full px-2 py-0.5 font-medium">
          {events.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`space-y-2.5 min-h-[200px] rounded-xl p-2 transition-colors ${
          isOver ? "bg-accent-soft" : ""
        }`}
      >
        <SortableContext items={events.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </SortableContext>

        {events.length === 0 && (
          <div className="flex items-center justify-center h-[120px] rounded-xl border border-dashed border-border-subtle text-text-muted text-xs">
            Drop events here
          </div>
        )}
      </div>
    </div>
  );
}
