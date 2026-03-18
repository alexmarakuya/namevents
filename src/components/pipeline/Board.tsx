"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { Column } from "./Column";
import { EventCard } from "./EventCard";
import { updateEventStage } from "@/lib/actions";
import { STAGE_ORDER, ENTITY_LABELS } from "@/lib/utils";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Event, Entity, EventStage } from "@/generated/prisma/client";

interface Props {
  events: Event[];
  activeEntity: Entity | null;
}

const ENTITIES: (Entity | null)[] = [null, "KIN_HAUS", "AI_MEETUP", "ISLAND_CONNECTION", "NAM_SPACE", "EXTERNAL"];

export function Board({ events: initialEvents, activeEntity }: Props) {
  const [events, setEvents] = useState(initialEvents);
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const eventsByStage = (stage: EventStage) =>
    events.filter((e) => e.stage === stage);

  function handleDragStart(event: DragStartEvent) {
    const evt = events.find((e) => e.id === event.active.id);
    if (evt) setActiveEvent(evt);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if dropping over a stage column
    if (STAGE_ORDER.includes(overId as EventStage)) {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === activeId ? { ...e, stage: overId as EventStage } : e
        )
      );
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveEvent(null);

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the target stage
    let targetStage: EventStage | null = null;
    if (STAGE_ORDER.includes(overId as EventStage)) {
      targetStage = overId as EventStage;
    } else {
      // Dropped on another card — find that card's stage
      const overEvent = events.find((e) => e.id === overId);
      if (overEvent) targetStage = overEvent.stage;
    }

    if (targetStage) {
      const evt = events.find((e) => e.id === activeId);
      if (evt && evt.stage !== targetStage) {
        // Optimistic update already applied in handleDragOver
        await updateEventStage(activeId, targetStage);
      }
    }
  }

  function setEntity(entity: Entity | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (entity) {
      params.set("entity", entity);
    } else {
      params.delete("entity");
    }
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <div>
      {/* Entity filter tabs */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {ENTITIES.map((entity) => (
          <button
            key={entity || "all"}
            onClick={() => setEntity(entity)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
              activeEntity === entity
                ? "bg-bg-elevated text-text-primary"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-surface"
            }`}
          >
            {entity ? ENTITY_LABELS[entity] : "All"}
          </button>
        ))}
      </div>

      {/* Kanban board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGE_ORDER.map((stage) => (
            <Column
              key={stage}
              stage={stage}
              events={eventsByStage(stage)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeEvent && <EventCard event={activeEvent} />}
        </DragOverlay>
      </DndContext>

      {events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <p className="text-lg mb-4">No events yet</p>
          <Link
            href="/events/new"
            className="rounded-[10px] bg-accent hover:bg-accent-hover text-white font-semibold text-sm py-2 px-4 transition-colors"
          >
            Create your first event
          </Link>
        </div>
      )}
    </div>
  );
}
