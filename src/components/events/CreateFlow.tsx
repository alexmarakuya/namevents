"use client";

import { useState, useCallback, useRef } from "react";
import { createEvent } from "@/lib/actions";
import {
  ENTITY_LABELS,
  FORMAT_LABELS,
  STAGE_LABELS,
  STAGE_ORDER,
} from "@/lib/utils";
import type { Entity, EventFormat, EventStage } from "@/generated/prisma/client";

const ENTITIES = Object.keys(ENTITY_LABELS) as Entity[];
const FORMATS = Object.keys(FORMAT_LABELS) as EventFormat[];
const STAGES = [...STAGE_ORDER, "CANCELLED" as EventStage];

interface EventData {
  title: string;
  entity: Entity;
  format: EventFormat;
  stage: EventStage;
  date: string;
  endDate: string;
  location: string;
  locationUrl: string;
  shortBlurb: string;
  description: string;
  tags: string;
  notes: string;
}

const INITIAL_DATA: EventData = {
  title: "",
  entity: "EXTERNAL",
  format: "SOCIAL",
  stage: "SEED",
  date: "",
  endDate: "",
  location: "",
  locationUrl: "",
  shortBlurb: "",
  description: "",
  tags: "",
  notes: "",
};

type Step = {
  key: keyof EventData | "review";
  question: string;
  subtitle?: string;
  type: "text" | "select" | "datetime" | "textarea" | "review";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  rows?: number;
};

const STEPS: Step[] = [
  {
    key: "title",
    question: "What's the event called?",
    type: "text",
    required: true,
    placeholder: "Event title",
  },
  {
    key: "entity",
    question: "Which entity is this for?",
    subtitle: "Choose the brand or community hosting this event",
    type: "select",
    options: ENTITIES.map((e) => ({ value: e, label: ENTITY_LABELS[e] })),
  },
  {
    key: "format",
    question: "What kind of event is this?",
    type: "select",
    options: FORMATS.map((f) => ({ value: f, label: FORMAT_LABELS[f] })),
  },
  {
    key: "stage",
    question: "Where is it in the pipeline?",
    subtitle: "You can always change this later by dragging the card",
    type: "select",
    options: STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] })),
  },
  {
    key: "date",
    question: "When does it start?",
    subtitle: "Leave blank if the date isn't set yet",
    type: "datetime",
  },
  {
    key: "location",
    question: "Where is it happening?",
    subtitle: "Leave blank if it's still TBD",
    type: "text",
    placeholder: "Venue or address",
  },
  {
    key: "shortBlurb",
    question: "Describe it in a sentence or two",
    subtitle: "A short teaser for sharing — you can write more later",
    type: "textarea",
    placeholder: "What's this event about?",
    rows: 3,
  },
  {
    key: "tags",
    question: "Add some tags",
    subtitle: "Comma-separated — helps with filtering and discovery",
    type: "text",
    placeholder: "ai, community, tech, workshop",
  },
  {
    key: "review",
    question: "Looking good — ready to create?",
    subtitle: "You can edit all the details after creating",
    type: "review",
  },
];

const ENTITY_COLORS: Record<Entity, string> = {
  KIN_HAUS: "border-entity-kin-haus text-entity-kin-haus",
  AI_MEETUP: "border-entity-ai-meetup text-entity-ai-meetup",
  NAM_SPACE: "border-entity-nam-space text-entity-nam-space",
  NAM_STUDIO: "border-entity-nam-studio text-entity-nam-studio",
  EXTERNAL: "border-border text-text-secondary",
};

export function CreateFlow() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<EventData>(INITIAL_DATA);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  const updateField = useCallback(
    (key: keyof EventData, value: string) => {
      setData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  function canAdvance(): boolean {
    if (current.required && current.key !== "review") {
      return !!data[current.key as keyof EventData];
    }
    return true;
  }

  function next() {
    if (!canAdvance()) return;
    if (step < STEPS.length - 1) {
      setDirection("forward");
      setStep((s) => s + 1);
    }
  }

  function back() {
    if (step > 0) {
      setDirection("back");
      setStep((s) => s - 1);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey && current.type !== "textarea") {
      e.preventDefault();
      next();
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value) formData.set(key, value);
    });
    formData.set("public", "false");
    await createEvent(formData);
  }

  return (
    <div className="min-h-screen bg-bg-base flex flex-col" onKeyDown={handleKeyDown}>
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-10">
        <div className="h-1 bg-border-subtle">
          <div
            className="h-full bg-accent transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-6 py-4">
        <button
          onClick={() => window.history.back()}
          className="text-sm text-text-muted hover:text-text-secondary transition-colors"
        >
          ← Back to dashboard
        </button>
        <span className="text-xs text-text-muted font-mono">
          {step + 1} / {STEPS.length}
        </span>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center px-6 pb-20">
        <div
          key={step}
          className={`w-full max-w-lg animate-fade-in ${
            direction === "forward" ? "animate-slide-up" : "animate-slide-down"
          }`}
        >
          {/* Question */}
          <h1 className="font-display text-3xl font-semibold text-text-primary mb-2 leading-tight">
            {current.question}
          </h1>
          {current.subtitle && (
            <p className="text-text-muted text-sm mb-8">
              {current.subtitle}
            </p>
          )}
          {!current.subtitle && <div className="mb-8" />}

          {/* Input */}
          {current.type === "text" && current.key !== "review" && (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              autoFocus
              value={data[current.key as keyof EventData]}
              onChange={(e) =>
                updateField(current.key as keyof EventData, e.target.value)
              }
              placeholder={current.placeholder}
              className="w-full bg-transparent border-b-2 border-border focus:border-accent text-text-primary text-xl py-3 outline-none placeholder:text-text-muted/50 transition-colors"
            />
          )}

          {current.type === "textarea" && current.key !== "review" && (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              autoFocus
              value={data[current.key as keyof EventData]}
              onChange={(e) =>
                updateField(current.key as keyof EventData, e.target.value)
              }
              placeholder={current.placeholder}
              rows={current.rows || 4}
              className="w-full bg-transparent border-b-2 border-border focus:border-accent text-text-primary text-lg py-3 outline-none placeholder:text-text-muted/50 transition-colors resize-none"
            />
          )}

          {current.type === "select" && current.key !== "review" && (
            <div className="grid grid-cols-2 gap-3">
              {current.options?.map((opt) => {
                const isSelected =
                  data[current.key as keyof EventData] === opt.value;
                const entityColor =
                  current.key === "entity"
                    ? ENTITY_COLORS[opt.value as Entity]
                    : "";

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      updateField(
                        current.key as keyof EventData,
                        opt.value
                      );
                      // Auto-advance after selection with a brief delay
                      setTimeout(next, 300);
                    }}
                    className={`rounded-xl border-2 px-4 py-3.5 text-left text-sm font-medium transition-all ${
                      isSelected
                        ? current.key === "entity"
                          ? `${entityColor} bg-bg-card shadow-sm`
                          : "border-accent text-accent bg-bg-card shadow-sm"
                        : "border-border text-text-secondary hover:border-text-muted hover:bg-bg-card"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}

          {current.type === "datetime" && current.key !== "review" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-text-muted mb-2 uppercase tracking-wider">
                  Start
                </label>
                <input
                  type="datetime-local"
                  autoFocus
                  value={data.date}
                  onChange={(e) => updateField("date", e.target.value)}
                  className="w-full bg-bg-card border border-border rounded-xl px-4 py-3 text-text-primary focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-2 uppercase tracking-wider">
                  End (optional)
                </label>
                <input
                  type="datetime-local"
                  value={data.endDate}
                  onChange={(e) => updateField("endDate", e.target.value)}
                  className="w-full bg-bg-card border border-border rounded-xl px-4 py-3 text-text-primary focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                />
              </div>
            </div>
          )}

          {current.type === "review" && (
            <div className="bg-bg-card rounded-2xl border border-border p-6 space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-xl font-semibold text-text-primary">
                  {data.title}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white/90 bg-[var(--entity-${data.entity.toLowerCase().replace("_", "-")})]`}
                >
                  {ENTITY_LABELS[data.entity]}
                </span>
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-bg-elevated text-text-secondary">
                  {FORMAT_LABELS[data.format]}
                </span>
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-bg-elevated text-text-secondary">
                  {STAGE_LABELS[data.stage]}
                </span>
              </div>
              {data.date && (
                <p className="text-sm text-text-secondary">
                  📅 {new Date(data.date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              )}
              {data.location && (
                <p className="text-sm text-text-secondary">
                  📍 {data.location}
                </p>
              )}
              {data.shortBlurb && (
                <p className="text-sm text-text-muted italic">
                  {data.shortBlurb}
                </p>
              )}
              {data.tags && (
                <div className="flex flex-wrap gap-1.5">
                  {data.tags.split(",").map((tag) => tag.trim()).filter(Boolean).map((tag) => (
                    <span key={tag} className="rounded-full bg-bg-elevated px-2.5 py-0.5 text-xs text-text-secondary">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-bg-base/80 backdrop-blur-sm border-t border-border-subtle px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button
            onClick={back}
            disabled={step === 0}
            className={`text-sm font-medium transition-colors ${
              step === 0
                ? "text-text-muted/30 cursor-not-allowed"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            ↑ Back
          </button>

          {current.type === "review" ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-xl bg-accent hover:bg-accent-hover text-white font-medium py-3 px-8 transition-colors disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Event"}
            </button>
          ) : (
            <button
              onClick={next}
              disabled={!canAdvance()}
              className={`flex items-center gap-2 rounded-xl font-medium py-3 px-6 transition-all ${
                canAdvance()
                  ? "bg-accent hover:bg-accent-hover text-white"
                  : "bg-bg-elevated text-text-muted cursor-not-allowed"
              }`}
            >
              {current.required && !data[current.key as keyof EventData]
                ? "Type to continue"
                : "Continue"}
              <span className="text-xs opacity-70">↓</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
