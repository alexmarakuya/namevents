"use client";

import { useRef, useState } from "react";
import { createEvent, updateEvent, deleteEvent, regenerateShareToken, addDistribution, removeDistribution } from "@/lib/actions";
import {
  ENTITY_LABELS,
  FORMAT_LABELS,
  STAGE_LABELS,
  STAGE_ORDER,
  formatDateForInput,
  formatDateTime,
} from "@/lib/utils";
import { addEventPerson, removeEventPerson, setEventVenue } from "@/lib/actions";
import type { Event, Entity, EventFormat, EventStage, Distribution, Venue, Person, EventPerson } from "@/generated/prisma/client";

type EventPersonWithPerson = EventPerson & { person: Person };
type EventWithRelations = Event & {
  distributions?: Distribution[];
  venue?: Venue | null;
  people?: EventPersonWithPerson[];
};

interface Props {
  event?: EventWithRelations | null;
  venues?: Venue[];
  people?: Person[];
}

const ENTITIES = Object.keys(ENTITY_LABELS) as Entity[];
const FORMATS = Object.keys(FORMAT_LABELS) as EventFormat[];
const STAGES = [...STAGE_ORDER, "CANCELLED" as EventStage];

const SUGGESTED_PLATFORMS = ["Luma", "Todo Today", "WhatsApp", "Instagram", "Facebook", "LinkedIn"];

export function EventForm({ event, venues = [], people = [] }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPublic, setIsPublic] = useState(event?.public ?? false);
  const [shareToken, setShareToken] = useState(event?.shareToken ?? null);
  const [showDelete, setShowDelete] = useState(false);
  const [coverPreview, setCoverPreview] = useState(event?.coverImage ?? null);
  const [uploading, setUploading] = useState(false);
  const [showAddDist, setShowAddDist] = useState(false);
  const [newPlatform, setNewPlatform] = useState("");
  const [newPlatformUrl, setNewPlatformUrl] = useState("");
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [aiGenerating, setAiGenerating] = useState<string | null>(null);
  const [aiTone, setAiTone] = useState("warm");
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [addPersonRole, setAddPersonRole] = useState<"HOST" | "SPEAKER">("HOST");
  const [newPersonName, setNewPersonName] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [showNewVenue, setShowNewVenue] = useState(false);
  const [newVenueName, setNewVenueName] = useState("");
  const [newVenueAddress, setNewVenueAddress] = useState("");
  const [newVenueMapsUrl, setNewVenueMapsUrl] = useState("");
  const isEdit = !!event;

  async function handleSubmit(formData: FormData) {
    formData.set("public", isPublic.toString());
    if (coverPreview) formData.set("coverImage", coverPreview);

    if (isEdit) {
      await updateEvent(event.id, formData);
    } else {
      await createEvent(formData);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setCoverPreview(data.url);
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleRegenToken() {
    if (!event) return;
    const newToken = await regenerateShareToken(event.id);
    setShareToken(newToken);
  }

  function copyShareLink() {
    if (!shareToken) return;
    const url = `${window.location.origin}/preview/${shareToken}`;
    navigator.clipboard.writeText(url);
  }

  function buildWhatsAppMessage(): string {
    if (!event) return "";
    const lines: string[] = [];
    lines.push(`*${event.title}*`);
    if (event.shortBlurb) lines.push(event.shortBlurb);
    lines.push("");
    if (event.date) lines.push(`📅 ${formatDateTime(event.date)}`);
    if (event.location) lines.push(`📍 ${event.location}`);
    if (event.locationUrl) lines.push(event.locationUrl);
    lines.push("");
    if (event.registrationUrl) {
      lines.push(`Register → ${event.registrationUrl}`);
    } else if (event.externalUrl) {
      lines.push(`More info → ${event.externalUrl}`);
    } else if (shareToken) {
      lines.push(`Details → ${window.location.origin}/preview/${shareToken}`);
    }
    return lines.filter((l, i, arr) => !(l === "" && arr[i - 1] === "")).join("\n");
  }

  function copyWhatsApp() {
    const msg = buildWhatsAppMessage();
    navigator.clipboard.writeText(msg);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 2000);
  }

  async function handleAddDistribution() {
    if (!event || !newPlatform.trim()) return;
    await addDistribution(event.id, newPlatform.trim(), newPlatformUrl.trim() || null);
    setNewPlatform("");
    setNewPlatformUrl("");
    setShowAddDist(false);
  }

  async function handleRemoveDistribution(distId: string) {
    if (!event) return;
    await removeDistribution(distId, event.id);
  }

  async function handleSelectVenue(venueId: string) {
    if (!event) return;
    await setEventVenue(event.id, venueId || null);
  }

  async function handleCreateVenue() {
    if (!newVenueName.trim()) return;
    try {
      const res = await fetch("/api/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newVenueName.trim(),
          address: newVenueAddress.trim() || null,
          mapsUrl: newVenueMapsUrl.trim() || null,
        }),
      });
      if (res.ok && event) {
        const venue = await res.json();
        await setEventVenue(event.id, venue.id);
      }
    } catch { /* silently fail */ }
    setShowNewVenue(false);
    setNewVenueName("");
    setNewVenueAddress("");
    setNewVenueMapsUrl("");
  }

  async function handleAddPerson() {
    if (!event) return;
    if (selectedPersonId) {
      await addEventPerson(event.id, selectedPersonId, addPersonRole);
    } else if (newPersonName.trim()) {
      // Create new person, then link
      try {
        const res = await fetch("/api/people", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newPersonName.trim() }),
        });
        if (res.ok) {
          const person = await res.json();
          await addEventPerson(event.id, person.id, addPersonRole);
        }
      } catch { /* silently fail */ }
    }
    setShowAddPerson(false);
    setSelectedPersonId("");
    setNewPersonName("");
  }

  async function handleRemovePerson(eventPersonId: string) {
    if (!event) return;
    await removeEventPerson(eventPersonId, event.id);
  }

  function getFormValue(name: string): string {
    if (!formRef.current) return "";
    const el = formRef.current.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    return el?.value ?? "";
  }

  function setFormValue(name: string, value: string) {
    if (!formRef.current) return;
    const el = formRef.current.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
    if (el) {
      // For React controlled/uncontrolled inputs, we need to set nativeInputValueSetter
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, "value"
      )?.set || Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, "value"
      )?.set;
      nativeInputValueSetter?.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  async function handleAiDescription() {
    const title = getFormValue("title");
    const rawDescription = getFormValue("description") || title;
    if (!rawDescription || rawDescription.trim().length < 3) return;

    setAiGenerating("description");
    try {
      const res = await fetch("/api/ai/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawDescription,
          entity: getFormValue("entity"),
          format: getFormValue("format"),
          date: getFormValue("date") || null,
          location: getFormValue("location") || null,
          tone: aiTone,
        }),
      });
      const data = await res.json();
      if (data.description) {
        setFormValue("description", data.description);
      }
      if (data.title && !getFormValue("title")) {
        setFormValue("title", data.title);
      }
    } catch {
      // silently fail — user can write manually
    }
    setAiGenerating(null);
  }

  async function handleAiBlurb() {
    const title = getFormValue("title");
    if (!title || title.trim().length < 3) return;

    setAiGenerating("blurb");
    try {
      const res = await fetch("/api/ai/blurb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: getFormValue("description") || null,
          entity: getFormValue("entity"),
          format: getFormValue("format"),
        }),
      });
      const data = await res.json();
      if (data.blurb) {
        setFormValue("shortBlurb", data.blurb);
      }
    } catch {
      // silently fail
    }
    setAiGenerating(null);
  }

  async function handleAiTags() {
    const title = getFormValue("title");
    if (!title || title.trim().length < 3) return;

    setAiGenerating("tags");
    try {
      const res = await fetch("/api/ai/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: getFormValue("description") || null,
          entity: getFormValue("entity"),
          format: getFormValue("format"),
        }),
      });
      const data = await res.json();
      if (data.tags && data.tags.length > 0) {
        setFormValue("tags", data.tags.join(", "));
      }
    } catch {
      // silently fail
    }
    setAiGenerating(null);
  }

  return (
    <form ref={formRef} action={handleSubmit} className="max-w-3xl space-y-8">
      {/* Core Details */}
      <section>
        <h2 className="font-display text-xl font-bold text-text-primary mb-4">
          Core Details
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Title *
            </label>
            <input
              name="title"
              defaultValue={event?.title ?? ""}
              required
              autoFocus
              className="w-full rounded-[10px] bg-bg-card border border-border px-3.5 py-2.5 text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              placeholder="Event title"
            />
          </div>

          {isEdit && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Slug
              </label>
              <input
                name="slug"
                defaultValue={event?.slug ?? ""}
                className="w-full rounded-[10px] bg-bg-card border border-border px-3.5 py-2.5 text-text-primary font-mono text-sm placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Entity
              </label>
              <select
                name="entity"
                defaultValue={event?.entity ?? "EXTERNAL"}
                className="w-full rounded-[10px] bg-bg-card border border-border px-3.5 py-2.5 text-text-primary focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              >
                {ENTITIES.map((e) => (
                  <option key={e} value={e}>{ENTITY_LABELS[e]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Format
              </label>
              <select
                name="format"
                defaultValue={event?.format ?? "SOCIAL"}
                className="w-full rounded-[10px] bg-bg-card border border-border px-3.5 py-2.5 text-text-primary focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              >
                {FORMATS.map((f) => (
                  <option key={f} value={f}>{FORMAT_LABELS[f]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Stage
              </label>
              <select
                name="stage"
                defaultValue={event?.stage ?? "SEED"}
                className="w-full rounded-[10px] bg-bg-card border border-border px-3.5 py-2.5 text-text-primary focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Start Date & Time
              </label>
              <input
                name="date"
                type="datetime-local"
                defaultValue={formatDateForInput(event?.date ?? null)}
                className="w-full rounded-[10px] bg-bg-card border border-border px-3.5 py-2.5 text-text-primary focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                End Date & Time
              </label>
              <input
                name="endDate"
                type="datetime-local"
                defaultValue={formatDateForInput(event?.endDate ?? null)}
                className="w-full rounded-[10px] bg-bg-card border border-border px-3.5 py-2.5 text-text-primary focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              />
            </div>
          </div>

          {/* Venue */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Venue
            </label>
            {isEdit ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <select
                    value={event?.venueId ?? ""}
                    onChange={(e) => handleSelectVenue(e.target.value)}
                    className="flex-1 rounded-[10px] bg-bg-card border border-border px-3.5 py-2.5 text-text-primary focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                  >
                    <option value="">No venue selected</option>
                    {venues.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}{v.address ? ` — ${v.address}` : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewVenue(!showNewVenue)}
                    className="rounded-[10px] border border-dashed border-border hover:border-accent text-text-secondary hover:text-accent text-sm py-2.5 px-3 transition-colors flex-shrink-0"
                  >
                    + New
                  </button>
                </div>
                {event?.venue && (
                  <div className="text-xs text-text-muted flex items-center gap-3">
                    {event.venue.address && <span>📍 {event.venue.address}</span>}
                    {event.venue.mapsUrl && (
                      <a href={event.venue.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover">
                        Maps →
                      </a>
                    )}
                  </div>
                )}
                {showNewVenue && (
                  <div className="rounded-[10px] bg-bg-card border border-border p-4 space-y-3">
                    <input
                      type="text"
                      value={newVenueName}
                      onChange={(e) => setNewVenueName(e.target.value)}
                      placeholder="Venue name"
                      className="w-full rounded-[10px] bg-bg-base border border-border px-3.5 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                    />
                    <input
                      type="text"
                      value={newVenueAddress}
                      onChange={(e) => setNewVenueAddress(e.target.value)}
                      placeholder="Address (optional)"
                      className="w-full rounded-[10px] bg-bg-base border border-border px-3.5 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                    />
                    <input
                      type="url"
                      value={newVenueMapsUrl}
                      onChange={(e) => setNewVenueMapsUrl(e.target.value)}
                      placeholder="Google Maps link (optional)"
                      className="w-full rounded-[10px] bg-bg-base border border-border px-3.5 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                    />
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={handleCreateVenue} disabled={!newVenueName.trim()} className="rounded-[10px] bg-accent hover:bg-accent-hover text-white text-sm font-medium py-2 px-4 transition-colors disabled:opacity-50">
                        Create & Select
                      </button>
                      <button type="button" onClick={() => setShowNewVenue(false)} className="text-sm text-text-muted hover:text-text-secondary">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* For new events, keep simple text fields */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  name="location"
                  defaultValue=""
                  className="w-full rounded-[10px] bg-bg-card border border-border px-3.5 py-2.5 text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                  placeholder="Venue or address"
                />
                <input
                  name="locationUrl"
                  type="url"
                  defaultValue=""
                  className="w-full rounded-[10px] bg-bg-card border border-border px-3.5 py-2.5 text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                  placeholder="Google Maps link"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Public Content */}
      <section>
        <h2 className="font-display text-xl font-bold text-text-primary mb-4">
          Public Content
        </h2>
        <div className="space-y-4">
          {/* Cover Image */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Cover Image
            </label>
            <div className="flex items-start gap-4">
              {coverPreview ? (
                <div className="relative w-32 h-20 rounded-lg overflow-hidden bg-bg-elevated">
                  <img src={coverPreview} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setCoverPreview(null)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  >
                    &times;
                  </button>
                </div>
              ) : null}
              <label className="flex items-center gap-2 rounded-[10px] border border-dashed border-border hover:border-accent px-4 py-3 cursor-pointer transition-colors bg-bg-card">
                <span className="text-sm text-text-secondary">
                  {uploading ? "Uploading..." : "Upload image"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-text-secondary">
                Short Blurb
              </label>
              <button
                type="button"
                onClick={handleAiBlurb}
                disabled={aiGenerating === "blurb"}
                className="text-xs text-accent hover:text-accent-hover transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {aiGenerating === "blurb" ? (
                  <span className="animate-pulse">Generating...</span>
                ) : (
                  <>✨ Generate blurb</>
                )}
              </button>
            </div>
            <textarea
              name="shortBlurb"
              defaultValue={event?.shortBlurb ?? ""}
              rows={2}
              className="w-full rounded-[10px] bg-bg-card border border-border px-3.5 py-2.5 text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent transition-colors resize-none"
              placeholder="1-2 sentence teaser"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-text-secondary">
                Description
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {(["warm", "informative", "hype", "minimal"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAiTone(t)}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                        aiTone === t
                          ? "bg-accent text-white"
                          : "bg-bg-elevated text-text-muted hover:text-text-secondary"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAiDescription}
                  disabled={aiGenerating === "description"}
                  className="text-xs text-accent hover:text-accent-hover transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {aiGenerating === "description" ? (
                    <span className="animate-pulse">Writing...</span>
                  ) : (
                    <>✨ Write with AI</>
                  )}
                </button>
              </div>
            </div>
            <textarea
              name="description"
              defaultValue={event?.description ?? ""}
              rows={8}
              className="w-full rounded-[10px] bg-bg-card border border-border px-3.5 py-2.5 text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent transition-colors resize-y"
              placeholder="Full event description (Markdown supported)"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-text-secondary">
                  Tags
                </label>
                <button
                  type="button"
                  onClick={handleAiTags}
                  disabled={aiGenerating === "tags"}
                  className="text-xs text-accent hover:text-accent-hover transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {aiGenerating === "tags" ? (
                    <span className="animate-pulse">Suggesting...</span>
                  ) : (
                    <>✨ Suggest tags</>
                  )}
                </button>
              </div>
              <input
                name="tags"
                defaultValue={event?.tags?.join(", ") ?? ""}
                className="w-full rounded-[10px] bg-bg-card border border-border px-3.5 py-2.5 text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                placeholder="ai, community, tech (comma separated)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Co-hosts
              </label>
              <input
                name="coHosts"
                defaultValue={event?.coHosts?.join(", ") ?? ""}
                className="w-full rounded-[10px] bg-bg-card border border-border px-3.5 py-2.5 text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                placeholder="Comma separated"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Capacity
              </label>
              <input
                name="capacity"
                type="number"
                defaultValue={event?.capacity ?? ""}
                className="w-full rounded-[10px] bg-bg-card border border-border px-3.5 py-2.5 text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                placeholder="Max attendees"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Registration URL
              </label>
              <input
                name="registrationUrl"
                type="url"
                defaultValue={event?.registrationUrl ?? ""}
                className="w-full rounded-[10px] bg-bg-card border border-border px-3.5 py-2.5 text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                placeholder="Link to RSVP"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                External URL
              </label>
              <input
                name="externalUrl"
                type="url"
                defaultValue={event?.externalUrl ?? ""}
                className="w-full rounded-[10px] bg-bg-card border border-border px-3.5 py-2.5 text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                placeholder="Luma, Eventbrite, etc."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Internal Notes */}
      <section>
        <h2 className="font-display text-xl font-bold text-text-primary mb-4">
          Internal Notes
        </h2>
        <textarea
          name="notes"
          defaultValue={event?.notes ?? ""}
          rows={4}
          className="w-full rounded-[10px] bg-bg-card border border-border px-3.5 py-2.5 text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent transition-colors resize-y"
          placeholder="Private notes — never exposed publicly"
        />
      </section>

      {/* Hosts & Speakers */}
      {isEdit && (
        <section>
          <h2 className="font-display text-xl font-bold text-text-primary mb-4">
            Hosts & Speakers
          </h2>
          <div className="space-y-3">
            {/* Current hosts */}
            {event.people && event.people.filter((ep: EventPersonWithPerson) => ep.role === "HOST").length > 0 && (
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider font-medium mb-2">Hosts</p>
                <div className="space-y-1.5">
                  {event.people.filter((ep: EventPersonWithPerson) => ep.role === "HOST").map((ep: EventPersonWithPerson) => (
                    <div key={ep.id} className="flex items-center gap-3 rounded-[10px] bg-bg-card border border-border px-4 py-2.5">
                      <span className="text-sm font-medium text-text-primary">{ep.person.name}</span>
                      {ep.person.email && <span className="text-xs text-text-muted">{ep.person.email}</span>}
                      <button type="button" onClick={() => handleRemovePerson(ep.id)} className="ml-auto text-text-muted hover:text-red-600 transition-colors text-xs">&times;</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current speakers */}
            {event.people && event.people.filter((ep: EventPersonWithPerson) => ep.role === "SPEAKER").length > 0 && (
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider font-medium mb-2">Speakers</p>
                <div className="space-y-1.5">
                  {event.people.filter((ep: EventPersonWithPerson) => ep.role === "SPEAKER").map((ep: EventPersonWithPerson) => (
                    <div key={ep.id} className="flex items-center gap-3 rounded-[10px] bg-bg-card border border-border px-4 py-2.5">
                      <span className="text-sm font-medium text-text-primary">{ep.person.name}</span>
                      {ep.person.email && <span className="text-xs text-text-muted">{ep.person.email}</span>}
                      <button type="button" onClick={() => handleRemovePerson(ep.id)} className="ml-auto text-text-muted hover:text-red-600 transition-colors text-xs">&times;</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add person */}
            {showAddPerson ? (
              <div className="rounded-[10px] bg-bg-card border border-border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  {(["HOST", "SPEAKER"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setAddPersonRole(r)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        addPersonRole === r ? "bg-accent text-white" : "bg-bg-elevated text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {r === "HOST" ? "Host" : "Speaker"}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1.5 uppercase tracking-wider">
                    Select existing person
                  </label>
                  <select
                    value={selectedPersonId}
                    onChange={(e) => { setSelectedPersonId(e.target.value); setNewPersonName(""); }}
                    className="w-full rounded-[10px] bg-bg-base border border-border px-3.5 py-2 text-sm text-text-primary focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                  >
                    <option value="">Choose a person...</option>
                    {people
                      .filter((p) => !event.people?.some((ep: EventPersonWithPerson) => ep.personId === p.id && ep.role === addPersonRole))
                      .map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1.5 uppercase tracking-wider">
                    Or add someone new
                  </label>
                  <input
                    type="text"
                    value={newPersonName}
                    onChange={(e) => { setNewPersonName(e.target.value); setSelectedPersonId(""); }}
                    placeholder="Full name"
                    className="w-full rounded-[10px] bg-bg-base border border-border px-3.5 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddPerson}
                    disabled={!selectedPersonId && !newPersonName.trim()}
                    className="rounded-[10px] bg-accent hover:bg-accent-hover text-white text-sm font-medium py-2 px-4 transition-colors disabled:opacity-50"
                  >
                    Add {addPersonRole === "HOST" ? "Host" : "Speaker"}
                  </button>
                  <button type="button" onClick={() => setShowAddPerson(false)} className="text-sm text-text-muted hover:text-text-secondary">Cancel</button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddPerson(true)}
                className="rounded-[10px] border border-dashed border-border hover:border-accent text-text-secondary hover:text-accent text-sm py-2.5 px-4 transition-colors"
              >
                + Add host or speaker
              </button>
            )}
          </div>
        </section>
      )}

      {/* Publishing Controls */}
      <section>
        <h2 className="font-display text-xl font-bold text-text-primary mb-4">
          Publishing
        </h2>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              onClick={() => setIsPublic(!isPublic)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isPublic ? "bg-accent" : "bg-bg-elevated"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isPublic ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm text-text-primary font-medium">
              {isPublic ? "Public — visible in API" : "Private — hidden from API"}
            </span>
          </label>

          {/* Share link */}
          {isEdit && shareToken && (
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/preview/${shareToken}`}
                className="flex-1 rounded-[10px] bg-bg-card border border-border px-3.5 py-2 text-text-secondary text-sm font-mono"
              />
              <button
                type="button"
                onClick={copyShareLink}
                className="rounded-[10px] border border-border hover:border-accent text-text-secondary hover:text-accent text-sm py-2 px-3 transition-colors"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={handleRegenToken}
                className="rounded-[10px] border border-border hover:border-text-muted text-text-muted hover:text-text-secondary text-sm py-2 px-3 transition-colors"
              >
                Regenerate
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Distribution & Sharing */}
      {isEdit && (
        <section>
          <h2 className="font-display text-xl font-bold text-text-primary mb-4">
            Distribution
          </h2>
          <div className="space-y-4">
            {/* WhatsApp copy */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={copyWhatsApp}
                className="rounded-[10px] bg-[#25D366] hover:bg-[#1da851] text-white font-medium text-sm py-2.5 px-4 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                {copiedWhatsApp ? "Copied!" : "Copy for WhatsApp"}
              </button>
            </div>

            {/* Posted platforms */}
            {event.distributions && event.distributions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-text-muted uppercase tracking-wider font-medium">
                  Posted to
                </p>
                {event.distributions.map((dist: Distribution) => (
                  <div
                    key={dist.id}
                    className="flex items-center gap-3 rounded-[10px] bg-bg-card border border-border px-4 py-2.5"
                  >
                    <span className="text-sm font-medium text-text-primary">
                      {dist.platform}
                    </span>
                    {dist.url && (
                      <a
                        href={dist.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent hover:text-accent-hover truncate max-w-[240px]"
                      >
                        {dist.url}
                      </a>
                    )}
                    <span className="text-xs text-text-muted ml-auto flex-shrink-0">
                      {new Date(dist.postedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDistribution(dist.id)}
                      className="text-text-muted hover:text-red-600 transition-colors text-xs flex-shrink-0"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add platform */}
            {showAddDist ? (
              <div className="rounded-[10px] bg-bg-card border border-border p-4 space-y-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1.5 uppercase tracking-wider">
                    Platform
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {SUGGESTED_PLATFORMS.filter(
                      (p) => !event.distributions?.some((d: Distribution) => d.platform === p)
                    ).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewPlatform(p)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          newPlatform === p
                            ? "bg-accent text-white"
                            : "bg-bg-elevated text-text-secondary hover:text-text-primary"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={newPlatform}
                    onChange={(e) => setNewPlatform(e.target.value)}
                    placeholder="Or type a custom platform name"
                    className="w-full rounded-[10px] bg-bg-base border border-border px-3.5 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1.5 uppercase tracking-wider">
                    Link (optional)
                  </label>
                  <input
                    type="url"
                    value={newPlatformUrl}
                    onChange={(e) => setNewPlatformUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-[10px] bg-bg-base border border-border px-3.5 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddDistribution}
                    disabled={!newPlatform.trim()}
                    className="rounded-[10px] bg-accent hover:bg-accent-hover text-white text-sm font-medium py-2 px-4 transition-colors disabled:opacity-50"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddDist(false);
                      setNewPlatform("");
                      setNewPlatformUrl("");
                    }}
                    className="text-sm text-text-muted hover:text-text-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddDist(true)}
                className="rounded-[10px] border border-dashed border-border hover:border-accent text-text-secondary hover:text-accent text-sm py-2.5 px-4 transition-colors"
              >
                + Mark as posted
              </button>
            )}
          </div>
        </section>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <button
          type="submit"
          className="rounded-[10px] bg-accent hover:bg-accent-hover text-white font-semibold py-2.5 px-6 transition-colors"
        >
          {isEdit ? "Save Changes" : "Create Event"}
        </button>

        {isEdit && (
          <>
            <div className="flex-1" />
            {showDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600">Delete this event?</span>
                <button
                  type="button"
                  onClick={() => deleteEvent(event.id)}
                  className="rounded-[10px] bg-red-600 hover:bg-red-700 text-white text-sm py-2 px-4 transition-colors"
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setShowDelete(false)}
                  className="text-sm text-text-muted hover:text-text-secondary"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                className="text-sm text-text-muted hover:text-red-600 transition-colors"
              >
                Delete event
              </button>
            )}
          </>
        )}
      </div>
    </form>
  );
}
