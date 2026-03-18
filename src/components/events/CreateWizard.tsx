"use client";

import { useState, useCallback, useRef } from "react";
import { createEvent } from "@/lib/actions";
import {
  ENTITY_LABELS,
  FORMAT_LABELS,
  STAGE_LABELS,
  STAGE_ORDER,
} from "@/lib/utils";
import { Logo } from "@/components/logo";
import type { Entity, EventFormat, EventStage } from "@/generated/prisma/client";

const ENTITIES = Object.keys(ENTITY_LABELS) as Entity[];
const FORMATS = Object.keys(FORMAT_LABELS) as EventFormat[];

type SectionState = "active" | "completed" | "locked";

const SECTION_COUNT = 5;
const SECTION_TITLES = [
  "What's the event called?",
  "Which entity is this for?",
  "What kind of event?",
  "When is it happening?",
  "Where is it?",
];

function CheckIcon({ animate }: { animate: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
      <circle cx="12" cy="12" r="10" fill="none" stroke="var(--border)" strokeWidth="1.5"
        className={animate ? "animate-[check-circle_0.4s_ease-out_forwards]" : ""} />
      <path d="M8 12.5l2.5 2.5 5-5" fill="none" stroke="var(--accent)" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        className={animate ? "animate-[check-path_0.3s_ease-out_0.2s_forwards]" : ""} />
    </svg>
  );
}

function OkButton({ onClick, label = "OK", hint = "press Enter" }: { onClick: () => void; label?: string; hint?: string }) {
  return (
    <div className="mt-5 flex items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-mono text-[13px] font-medium text-white transition-all hover:bg-accent-hover active:scale-95"
      >
        {label}
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </button>
      <span className="font-mono text-xs text-text-muted">{hint}</span>
    </div>
  );
}

export function CreateWizard() {
  const [title, setTitle] = useState("");
  const [entity, setEntity] = useState<Entity>("EXTERNAL");
  const [format, setFormat] = useState<EventFormat>("SOCIAL");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [activeSection, setActiveSection] = useState(0);
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set());
  const [recentlyCompleted, setRecentlyCompleted] = useState<number | null>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const canAdvance = useCallback((section: number) => {
    switch (section) {
      case 0: return title.trim().length > 0;
      case 1: return true; // entity always has a value
      case 2: return true; // format always has a value
      case 3: return true; // date is optional
      case 4: return true; // location is optional
      default: return false;
    }
  }, [title]);

  const advanceSection = useCallback((from: number) => {
    if (from >= SECTION_COUNT - 1) return;
    setCompletedSections((prev) => new Set([...prev, from]));
    setRecentlyCompleted(from);
    setTimeout(() => setRecentlyCompleted(null), 600);
    const next = from + 1;
    setActiveSection(next);
    setTimeout(() => {
      sectionRefs.current[next]?.scrollIntoView({ behavior: "smooth", block: "start" });
      const firstInput = sectionRefs.current[next]?.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select");
      if (firstInput) setTimeout(() => firstInput.focus(), 400);
    }, 100);
  }, []);

  const goToSection = useCallback((target: number) => {
    if (target === activeSection) return;
    if (canAdvance(activeSection)) {
      setCompletedSections((prev) => new Set([...prev, activeSection]));
    }
    setActiveSection(target);
    setTimeout(() => {
      sectionRefs.current[target]?.scrollIntoView({ behavior: "smooth", block: "start" });
      const firstInput = sectionRefs.current[target]?.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select");
      if (firstInput) setTimeout(() => firstInput.focus(), 400);
    }, 100);
  }, [activeSection, canAdvance]);

  const getSectionState = useCallback((index: number): SectionState => {
    if (index === activeSection) return "active";
    if (completedSections.has(index)) return "completed";
    return "locked";
  }, [activeSection, completedSections]);

  function getSummary(section: number): string {
    switch (section) {
      case 0: return title || "Untitled";
      case 1: return ENTITY_LABELS[entity];
      case 2: return FORMAT_LABELS[format];
      case 3: return date ? new Date(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "No date yet";
      case 4: return location || "No venue yet";
      default: return "";
    }
  }

  function handleKeyDown(section: number, e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey && canAdvance(section)) {
      e.preventDefault();
      advanceSection(section);
    }
  }

  async function handleCreate() {
    setSubmitting(true);
    const formData = new FormData();
    formData.set("title", title);
    formData.set("entity", entity);
    formData.set("format", format);
    formData.set("stage", "SEED");
    if (date) formData.set("date", date);
    if (location) formData.set("location", location);
    formData.set("public", "false");
    await createEvent(formData);
  }

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Header */}
      <div className="border-b border-border bg-bg-card px-6 py-4 flex items-center gap-3">
        <Logo className="h-5 w-auto" />
        <span className="text-text-muted text-xs font-mono">Events</span>
      </div>

      <main className="mx-auto max-w-xl px-5 py-8 sm:py-12">
        <h1 className="font-display text-2xl font-semibold text-text-primary tracking-tight">
          New Event
        </h1>
        <p className="mt-1.5 text-sm text-text-muted">
          Start with the basics — you can add details later.
        </p>

        <div className="mt-8 space-y-4">
          {Array.from({ length: SECTION_COUNT }).map((_, index) => {
            const state = getSectionState(index);

            if (state === "completed") {
              return (
                <div key={index} ref={(el) => { sectionRefs.current[index] = el; }}>
                  <button
                    type="button"
                    onClick={() => goToSection(index)}
                    className="group flex w-full items-start gap-3 rounded-2xl border border-border-subtle bg-bg-card/50 px-5 py-4 text-left transition-colors hover:border-border"
                  >
                    <CheckIcon animate={recentlyCompleted === index} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary/70">
                        {SECTION_TITLES[index]}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-text-muted">
                        {getSummary(index)}
                      </p>
                    </div>
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-text-muted opacity-0 transition-opacity group-hover:opacity-100">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                </div>
              );
            }

            if (state === "locked") {
              return (
                <div key={index} ref={(el) => { sectionRefs.current[index] = el; }}
                  className="rounded-2xl border border-border-subtle px-5 py-4 opacity-40"
                >
                  <p className="text-sm font-medium text-text-muted">
                    {SECTION_TITLES[index]}
                  </p>
                </div>
              );
            }

            // Active section
            return (
              <div key={index} ref={(el) => { sectionRefs.current[index] = el; }}
                className="rounded-2xl border border-border bg-bg-card p-5 sm:p-6"
                onKeyDown={(e) => handleKeyDown(index, e)}
              >
                <p className="text-sm font-medium text-text-secondary mb-4">
                  {SECTION_TITLES[index]}
                </p>

                {index === 0 && (
                  <div>
                    <input
                      type="text"
                      autoFocus
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Event title"
                      className="w-full rounded-xl border border-border bg-bg-base px-4 py-3 text-text-primary placeholder:text-text-muted/50 focus:border-accent focus:outline-none transition-colors"
                    />
                    {canAdvance(0) && <OkButton onClick={() => advanceSection(0)} />}
                  </div>
                )}

                {index === 1 && (
                  <div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {ENTITIES.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => { setEntity(e); setTimeout(() => advanceSection(1), 200); }}
                          className={`rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all ${
                            entity === e
                              ? "border-accent text-accent bg-accent-soft"
                              : "border-border text-text-secondary hover:border-text-muted"
                          }`}
                        >
                          {ENTITY_LABELS[e]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {index === 2 && (
                  <div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {FORMATS.map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => { setFormat(f); setTimeout(() => advanceSection(2), 200); }}
                          className={`rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all ${
                            format === f
                              ? "border-accent text-accent bg-accent-soft"
                              : "border-border text-text-secondary hover:border-text-muted"
                          }`}
                        >
                          {FORMAT_LABELS[f]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {index === 3 && (
                  <div>
                    <input
                      type="datetime-local"
                      autoFocus
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full rounded-xl border border-border bg-bg-base px-4 py-3 text-text-primary focus:border-accent focus:outline-none transition-colors"
                    />
                    <OkButton onClick={() => advanceSection(3)} label={date ? "OK" : "Skip"} hint={date ? "press Enter" : "add later"} />
                  </div>
                )}

                {index === 4 && (
                  <div>
                    <input
                      type="text"
                      autoFocus
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Venue or address"
                      className="w-full rounded-xl border border-border bg-bg-base px-4 py-3 text-text-primary placeholder:text-text-muted/50 focus:border-accent focus:outline-none transition-colors"
                    />
                    <div className="mt-5 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleCreate}
                        disabled={submitting}
                        className="flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 font-mono text-[13px] font-medium text-white transition-all hover:bg-accent-hover active:scale-95 disabled:opacity-50"
                      >
                        {submitting ? "Creating..." : "Create Event"}
                      </button>
                      <span className="font-mono text-xs text-text-muted">
                        {location ? "" : "venue is optional"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
