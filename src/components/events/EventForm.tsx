"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createEvent, updateEvent, deleteEvent, regenerateShareToken, addDistribution, removeDistribution, syncToPlatform, unsyncFromPlatform, fetchPlatformAttendance } from "@/lib/actions";
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

// Generate 30-min time slots
const TIME_SLOTS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIME_SLOTS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

function extractDate(dt: Date | string | null): string {
  if (!dt) return "";
  // Parse ISO string directly to avoid timezone drift
  const iso = typeof dt === "string" ? dt : dt.toISOString();
  const match = iso.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const d = new Date(dt);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function extractTime(dt: Date | string | null): string {
  if (!dt) return "18:00";
  // Parse ISO string directly to avoid timezone drift
  const iso = typeof dt === "string" ? dt : dt.toISOString();
  const match = iso.match(/T(\d{2}):(\d{2})/);
  if (match) {
    const h = match[1];
    const m = parseInt(match[2]) >= 30 ? "30" : "00";
    return `${h}:${m}`;
  }
  const d = new Date(dt);
  const h = String(d.getHours()).padStart(2, "0");
  const m = d.getMinutes() >= 30 ? "30" : "00";
  return `${h}:${m}`;
}

function addOneHour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const newH = (h + 1) % 24;
  return `${String(newH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Collapsible section
function Section({ title, defaultOpen = false, children, badge }: { title: string; defaultOpen?: boolean; children: React.ReactNode; badge?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <span className="text-sm font-medium text-text-secondary">{title}</span>
        <div className="flex items-center gap-2">
          {badge && <span className="text-xs text-text-muted">{badge}</span>}
          <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 text-text-muted transition-transform ${open ? "rotate-180" : ""}`}>
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </div>
      </button>
      {open && <div className="pb-5">{children}</div>}
    </div>
  );
}

export function EventForm({ event, venues = [], people = [] }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(event?.public ?? false);
  const [shareToken, setShareToken] = useState(event?.shareToken ?? null);
  const [showDelete, setShowDelete] = useState(false);
  const [coverPreview, setCoverPreview] = useState(event?.coverImage ?? null);
  const [uploading, setUploading] = useState(false);
  const [showAddDist, setShowAddDist] = useState(false);
  const [newPlatform, setNewPlatform] = useState("");
  const [newPlatformUrl, setNewPlatformUrl] = useState("");
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [copiedInstagram, setCopiedInstagram] = useState(false);
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
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSynced, setIsSynced] = useState(!!event?.platformEventId);
  const [attendance, setAttendance] = useState<{
    goingCount: number;
    interestedCount: number;
    attendees: { displayName: string; avatarUrl: string | null; status: string }[];
  } | null>(null);

  // Split date/time
  const [startDate, setStartDate] = useState(extractDate(event?.date ?? null));
  const [startTime, setStartTime] = useState(extractTime(event?.date ?? null));
  const [endTime, setEndTime] = useState(event?.endDate ? extractTime(event.endDate) : addOneHour(extractTime(event?.date ?? null)));

  const isEdit = !!event;

  async function handleSubmit(formData: FormData) {
    formData.set("public", isPublic.toString());
    if (coverPreview) formData.set("coverImage", coverPreview);

    // Combine date + time
    if (startDate) {
      formData.set("date", `${startDate}T${startTime}`);
      formData.set("endDate", `${startDate}T${endTime}`);
    }

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
    navigator.clipboard.writeText(`${window.location.origin}/preview/${shareToken}`);
  }

  function buildWhatsAppMessage(): string {
    if (!event) return "";
    const lines: string[] = [];
    lines.push(`*${event.title}*`);
    if (event.shortBlurb) lines.push(event.shortBlurb);
    lines.push("");
    if (event.date) lines.push(`📅 ${formatDateTime(event.date)}`);
    const venueName = event.venue?.name || event.location;
    if (venueName) lines.push(`📍 ${venueName}`);
    if (event.venue?.description) lines.push(event.venue.description);
    if (event.venue?.mapsUrl) lines.push(event.venue.mapsUrl);
    else if (event.locationUrl) lines.push(event.locationUrl);
    if (event.price) lines.push(`💰 ${event.price}`);
    lines.push("");
    if (event.registrationUrl) lines.push(`Register → ${event.registrationUrl}`);
    else if (event.externalUrl) lines.push(`More info → ${event.externalUrl}`);
    else if (shareToken) lines.push(`Details → ${window.location.origin}/preview/${shareToken}`);
    return lines.filter((l, i, arr) => !(l === "" && arr[i - 1] === "")).join("\n");
  }

  function copyWhatsApp() {
    navigator.clipboard.writeText(buildWhatsAppMessage());
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 2000);
  }

  function buildInstagramCaption(): string {
    if (!event) return "";
    const lines: string[] = [];
    lines.push(event.title);
    lines.push("");
    if (event.shortBlurb) {
      lines.push(event.shortBlurb);
      lines.push("");
    }
    const details: string[] = [];
    if (event.date) {
      const dateStr = extractDate(event.date);
      const d = new Date(dateStr + "T12:00:00");
      details.push(`📅 ${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`);
      const timeStr = extractTime(event.date);
      const endStr = event.endDate ? extractTime(event.endDate) : null;
      const [th, tm] = timeStr.split(":").map(Number);
      const ampm = th >= 12 ? "PM" : "AM";
      const h12 = th % 12 || 12;
      let timeDisplay = `🕐 ${h12}:${String(tm).padStart(2, "0")} ${ampm}`;
      if (endStr) {
        const [eh, em] = endStr.split(":").map(Number);
        const eampm = eh >= 12 ? "PM" : "AM";
        const eh12 = eh % 12 || 12;
        timeDisplay += ` – ${eh12}:${String(em).padStart(2, "0")} ${eampm}`;
      }
      details.push(timeDisplay);
    }
    const venueName = event.venue?.name || event.location;
    if (venueName) details.push(`📍 ${venueName}`);
    if (event.venue?.description) details.push(event.venue.description);
    if (event.price) details.push(`💰 ${event.price}`);
    if (details.length) {
      lines.push(details.join("\n"));
      lines.push("");
    }
    if (event.registrationUrl) {
      lines.push("Link in bio to register ☝️");
      lines.push("");
    }
    // Hashtags from tags
    const hashtags: string[] = [];
    if (event.tags?.length) {
      event.tags.forEach((tag) => {
        hashtags.push(`#${tag.replace(/[^a-zA-Z0-9]/g, "")}`);
      });
    }
    hashtags.push("#KohPhangan", "#IslandLife");
    const entityTag = event.entity === "KIN_HAUS" ? "#KinHaus" : event.entity === "AI_MEETUP" ? "#AIMeetup" : event.entity === "NAM_SPACE" ? "#NaMSpace" : event.entity === "ISLAND_CONNECTION" ? "#IslandConnection" : null;
    if (entityTag) hashtags.push(entityTag);
    lines.push(hashtags.join(" "));
    return lines.join("\n");
  }

  function copyInstagram() {
    navigator.clipboard.writeText(buildInstagramCaption());
    setCopiedInstagram(true);
    setTimeout(() => setCopiedInstagram(false), 2000);
  }

  // Platform sync
  useEffect(() => {
    if (isEdit && isSynced && event?.id) {
      fetchPlatformAttendance(event.id).then((data) => {
        if (data) setAttendance(data);
      });
    }
  }, [isEdit, isSynced, event?.id]);

  // Auto-generate AI content after wizard creation
  useEffect(() => {
    if (searchParams.get("ai") !== "1" || !isEdit || !event) return;
    // Clean the URL immediately
    router.replace(`/events/${event.id}`, { scroll: false });

    async function runAiGeneration() {
      // Generate description
      setAiGenerating("description");
      try {
        const res = await fetch("/api/ai/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rawDescription: event!.title,
            entity: event!.entity,
            format: event!.format,
            date: startDate || null,
            location: event!.venue?.name || event!.location || null,
            tone: "warm",
          }),
        });
        const data = await res.json();
        if (data.description) setFormValue("description", data.description);
      } catch {}
      setAiGenerating(null);

      // Generate blurb
      setAiGenerating("blurb");
      try {
        const descEl = formRef.current?.elements.namedItem("description") as HTMLTextAreaElement | null;
        const res = await fetch("/api/ai/blurb", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: event!.title,
            description: descEl?.value || null,
            entity: event!.entity,
            format: event!.format,
          }),
        });
        const data = await res.json();
        if (data.blurb) setFormValue("shortBlurb", data.blurb);
      } catch {}
      setAiGenerating(null);

      // Generate tags
      setAiGenerating("tags");
      try {
        const descEl = formRef.current?.elements.namedItem("description") as HTMLTextAreaElement | null;
        const res = await fetch("/api/ai/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: event!.title,
            description: descEl?.value || null,
            entity: event!.entity,
            format: event!.format,
          }),
        });
        const data = await res.json();
        if (data.tags?.length) setFormValue("tags", data.tags.join(", "));
      } catch {}
      setAiGenerating(null);
    }

    runAiGeneration();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSync() {
    if (!event) return;
    setSyncing(true);
    setSyncError(null);
    try {
      await syncToPlatform(event.id);
      setIsSynced(true);
      // Fetch attendance after sync
      const data = await fetchPlatformAttendance(event.id);
      if (data) setAttendance(data);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function handleUnsync() {
    if (!event) return;
    setSyncing(true);
    setSyncError(null);
    try {
      await unsyncFromPlatform(event.id);
      setIsSynced(false);
      setAttendance(null);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Unsync failed");
    } finally {
      setSyncing(false);
    }
  }

  // AI helpers
  function getFormValue(name: string): string {
    if (!formRef.current) return "";
    const el = formRef.current.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    return el?.value ?? "";
  }

  function setFormValue(name: string, value: string) {
    if (!formRef.current) return;
    const el = formRef.current.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
    if (el) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set
        || Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      setter?.call(el, value);
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
        body: JSON.stringify({ rawDescription, entity: getFormValue("entity"), format: getFormValue("format"), date: startDate || null, location: event?.venue?.name || getFormValue("location") || null, tone: aiTone }),
      });
      const data = await res.json();
      if (data.description) setFormValue("description", data.description);
      if (data.title && !getFormValue("title")) setFormValue("title", data.title);
    } catch {}
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
        body: JSON.stringify({ title, description: getFormValue("description") || null, entity: getFormValue("entity"), format: getFormValue("format") }),
      });
      const data = await res.json();
      if (data.blurb) setFormValue("shortBlurb", data.blurb);
    } catch {}
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
        body: JSON.stringify({ title, description: getFormValue("description") || null, entity: getFormValue("entity"), format: getFormValue("format") }),
      });
      const data = await res.json();
      if (data.tags?.length) setFormValue("tags", data.tags.join(", "));
    } catch {}
    setAiGenerating(null);
  }

  // Venue & Person handlers
  async function handleSelectVenue(venueId: string) {
    if (!event) return;
    await setEventVenue(event.id, venueId || null);
  }

  async function handleCreateVenue() {
    if (!newVenueName.trim()) return;
    try {
      const res = await fetch("/api/venues", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newVenueName.trim(), address: newVenueAddress.trim() || null, mapsUrl: newVenueMapsUrl.trim() || null }) });
      if (res.ok && event) {
        const venue = await res.json();
        await setEventVenue(event.id, venue.id);
      }
    } catch {}
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
      try {
        const res = await fetch("/api/people", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newPersonName.trim() }) });
        if (res.ok) { const person = await res.json(); await addEventPerson(event.id, person.id, addPersonRole); }
      } catch {}
    }
    setShowAddPerson(false);
    setSelectedPersonId("");
    setNewPersonName("");
  }

  async function handleRemovePerson(epId: string) {
    if (!event) return;
    await removeEventPerson(epId, event.id);
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

  const inputClass = "w-full rounded-xl border border-border bg-bg-card px-4 py-3 text-text-primary placeholder:text-text-muted/50 focus:border-accent focus:outline-none transition-colors";
  const labelClass = "block text-xs text-text-muted mb-1.5 uppercase tracking-wider font-mono";

  const bannerInputRef = useRef<HTMLInputElement>(null);

  return (
    <form ref={formRef} action={handleSubmit}>
      {/* ── Form Content ── */}
      <div className="mx-auto max-w-2xl px-5 sm:px-0 pt-8">

      {/* ── Cover Image Card ── */}
      <div
        className="relative rounded-2xl overflow-hidden cursor-pointer group mb-6 border border-border"
        onClick={() => bannerInputRef.current?.click()}
      >
        {coverPreview ? (
          <>
            <div className="w-full aspect-[2.5/1]">
              <img src={coverPreview} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setCoverPreview(null); }}
              className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              &times;
            </button>
            <div className="absolute bottom-3 left-3 bg-black/50 text-white/70 rounded-full px-3 py-1 text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity">
              Click to change
            </div>
          </>
        ) : (
          <div className="w-full bg-bg-card flex flex-col items-center justify-center py-12 hover:bg-bg-elevated transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 text-text-muted mb-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
            </svg>
            <span className="text-sm text-text-muted font-mono">Add cover image</span>
          </div>
        )}
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageUpload}
          className="hidden"
        />
        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl">
            <span className="text-white font-mono text-sm animate-pulse">Uploading...</span>
          </div>
        )}
      </div>

      {/* ── Title ── */}
      <div className="mb-6">
        <input
          name="title"
          defaultValue={event?.title ?? ""}
          required
          autoFocus
          className="w-full bg-transparent font-display text-2xl sm:text-3xl font-semibold text-text-primary placeholder:text-text-muted/40 focus:outline-none border-none"
          placeholder="Event title"
        />
      </div>

      {/* ── Entity / Format / Stage (inline) ── */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        <select name="entity" defaultValue={event?.entity ?? "EXTERNAL"} className="rounded-full border border-border bg-bg-card px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none cursor-pointer">
          {ENTITIES.map((e) => <option key={e} value={e}>{ENTITY_LABELS[e]}</option>)}
        </select>
        <select name="format" defaultValue={event?.format ?? "SOCIAL"} className="rounded-full border border-border bg-bg-card px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none cursor-pointer">
          {FORMATS.map((f) => <option key={f} value={f}>{FORMAT_LABELS[f]}</option>)}
        </select>
        <select name="stage" defaultValue={event?.stage ?? "SEED"} className="rounded-full border border-border bg-bg-card px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none cursor-pointer">
          {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
        </select>
      </div>

      {/* ── Date & Time ── */}
      <div className="rounded-2xl border border-border bg-bg-card p-5 mb-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Date</label>
            <div className="relative cursor-pointer" onClick={() => dateInputRef.current?.showPicker()}>
              <input
                ref={dateInputRef}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`${inputClass} cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Start</label>
            <select
              value={startTime}
              onChange={(e) => { setStartTime(e.target.value); setEndTime(addOneHour(e.target.value)); }}
              className={`${inputClass} cursor-pointer`}
            >
              {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>End</label>
            <select value={endTime} onChange={(e) => setEndTime(e.target.value)} className={`${inputClass} cursor-pointer`}>
              {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Venue ── */}
      <div className="rounded-2xl border border-border bg-bg-card p-5 mb-4">
        <label className={labelClass}>Venue</label>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <select value={event?.venueId ?? ""} onChange={(e) => handleSelectVenue(e.target.value)} className={`flex-1 ${inputClass} cursor-pointer`}>
              <option value="">Select a venue...</option>
              {venues.map((v) => <option key={v.id} value={v.id}>{v.name}{v.address ? ` — ${v.address}` : ""}</option>)}
            </select>
            <button type="button" onClick={() => setShowNewVenue(!showNewVenue)} className="rounded-full border border-dashed border-border hover:border-accent text-text-secondary hover:text-accent text-xs py-3 px-3 transition-colors flex-shrink-0">
              + New
            </button>
          </div>
          {event?.venue && (
            <div className="text-xs text-text-muted flex items-center gap-3">
              {event.venue.address && <span>📍 {event.venue.address}</span>}
              {event.venue.mapsUrl && <a href={event.venue.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover">Maps →</a>}
            </div>
          )}
          {showNewVenue && (
            <div className="space-y-2 mt-2">
              <input type="text" value={newVenueName} onChange={(e) => setNewVenueName(e.target.value)} placeholder="Venue name" className={inputClass} />
              <input type="text" value={newVenueAddress} onChange={(e) => setNewVenueAddress(e.target.value)} placeholder="Address (optional)" className={inputClass} />
              <input type="url" value={newVenueMapsUrl} onChange={(e) => setNewVenueMapsUrl(e.target.value)} placeholder="Google Maps link (optional)" className={inputClass} />
              <div className="flex gap-2">
                <button type="button" onClick={handleCreateVenue} disabled={!newVenueName.trim()} className="rounded-full bg-accent hover:bg-accent-hover text-white text-xs font-medium py-2 px-4 disabled:opacity-50">Create & Select</button>
                <button type="button" onClick={() => setShowNewVenue(false)} className="text-xs text-text-muted">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Content (blurb + description + image) ── */}
      <div className="rounded-2xl border border-border bg-bg-card p-5 mb-4 space-y-4">
        {/* Short Blurb */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={labelClass + " mb-0"}>Short Blurb</label>
            <button type="button" onClick={handleAiBlurb} disabled={aiGenerating === "blurb"} className="text-xs text-accent hover:text-accent-hover disabled:opacity-50">
              {aiGenerating === "blurb" ? "Generating..." : "✨ Generate"}
            </button>
          </div>
          <textarea name="shortBlurb" defaultValue={event?.shortBlurb ?? ""} rows={2} className={`${inputClass} resize-none`} placeholder="1-2 sentence teaser" />
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={labelClass + " mb-0"}>Description</label>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {(["warm", "informative", "hype", "minimal"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setAiTone(t)} className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${aiTone === t ? "bg-accent text-white" : "bg-bg-elevated text-text-muted hover:text-text-secondary"}`}>
                    {t}
                  </button>
                ))}
              </div>
              <button type="button" onClick={handleAiDescription} disabled={aiGenerating === "description"} className="text-xs text-accent hover:text-accent-hover disabled:opacity-50">
                {aiGenerating === "description" ? "Writing..." : "✨ Write with AI"}
              </button>
            </div>
          </div>
          <textarea name="description" defaultValue={event?.description ?? ""} rows={6} className={`${inputClass} resize-y`} placeholder="Full event description" />
        </div>

      </div>

      {/* ── Collapsible: More Details ── */}
      <div className="rounded-2xl border border-border bg-bg-card px-5 mb-4">
        <Section title="More Details" badge={event?.tags?.length ? `${event.tags.length} tags` : undefined}>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelClass + " mb-0"}>Tags</label>
                <button type="button" onClick={handleAiTags} disabled={aiGenerating === "tags"} className="text-xs text-accent hover:text-accent-hover disabled:opacity-50">
                  {aiGenerating === "tags" ? "Suggesting..." : "✨ Suggest"}
                </button>
              </div>
              <input name="tags" defaultValue={event?.tags?.join(", ") ?? ""} className={inputClass} placeholder="ai, community, tech" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Price</label>
                <input name="price" defaultValue={event?.price ?? ""} className={inputClass} placeholder="e.g. 300 THB, Free, Donation" />
              </div>
              <div>
                <label className={labelClass}>Capacity</label>
                <input name="capacity" type="number" defaultValue={event?.capacity ?? ""} className={inputClass} placeholder="Max" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Registration</label>
                <input name="registrationUrl" type="url" defaultValue={event?.registrationUrl ?? ""} className={inputClass} placeholder="RSVP link" />
              </div>
              <div>
                <label className={labelClass}>External URL</label>
                <input name="externalUrl" type="url" defaultValue={event?.externalUrl ?? ""} className={inputClass} placeholder="Luma, etc." />
              </div>
            </div>
            {isEdit && (
              <div>
                <label className={labelClass}>Slug</label>
                <input name="slug" defaultValue={event?.slug ?? ""} className={`${inputClass} font-mono text-sm`} />
              </div>
            )}
            <div>
              <label className={labelClass}>Internal Notes</label>
              <textarea name="notes" defaultValue={event?.notes ?? ""} rows={3} className={`${inputClass} resize-y`} placeholder="Private — never exposed publicly" />
            </div>
          </div>
        </Section>
      </div>

      {/* ── Collapsible: Hosts & Speakers ── */}
      {isEdit && (
        <div className="rounded-2xl border border-border bg-bg-card px-5 mb-4">
          <Section title="Hosts & Speakers" badge={event.people?.length ? `${event.people.length} people` : undefined}>
            <div className="space-y-3">
              {event.people && event.people.filter((ep: EventPersonWithPerson) => ep.role === "HOST").length > 0 && (
                <div>
                  <p className={labelClass}>Hosts</p>
                  {event.people.filter((ep: EventPersonWithPerson) => ep.role === "HOST").map((ep: EventPersonWithPerson) => (
                    <div key={ep.id} className="flex items-center gap-3 rounded-xl border border-border px-4 py-2.5 mb-1.5">
                      <span className="text-sm font-medium text-text-primary">{ep.person.name}</span>
                      <button type="button" onClick={() => handleRemovePerson(ep.id)} className="ml-auto text-text-muted hover:text-red-600 text-xs">&times;</button>
                    </div>
                  ))}
                </div>
              )}
              {event.people && event.people.filter((ep: EventPersonWithPerson) => ep.role === "SPEAKER").length > 0 && (
                <div>
                  <p className={labelClass}>Speakers</p>
                  {event.people.filter((ep: EventPersonWithPerson) => ep.role === "SPEAKER").map((ep: EventPersonWithPerson) => (
                    <div key={ep.id} className="flex items-center gap-3 rounded-xl border border-border px-4 py-2.5 mb-1.5">
                      <span className="text-sm font-medium text-text-primary">{ep.person.name}</span>
                      <button type="button" onClick={() => handleRemovePerson(ep.id)} className="ml-auto text-text-muted hover:text-red-600 text-xs">&times;</button>
                    </div>
                  ))}
                </div>
              )}
              {showAddPerson ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {(["HOST", "SPEAKER"] as const).map((r) => (
                      <button key={r} type="button" onClick={() => setAddPersonRole(r)} className={`rounded-full px-3 py-1 text-xs font-medium ${addPersonRole === r ? "bg-accent text-white" : "bg-bg-elevated text-text-secondary"}`}>
                        {r === "HOST" ? "Host" : "Speaker"}
                      </button>
                    ))}
                  </div>
                  <select value={selectedPersonId} onChange={(e) => { setSelectedPersonId(e.target.value); setNewPersonName(""); }} className={inputClass}>
                    <option value="">Choose a person...</option>
                    {people.filter((p) => !event.people?.some((ep: EventPersonWithPerson) => ep.personId === p.id && ep.role === addPersonRole)).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <input type="text" value={newPersonName} onChange={(e) => { setNewPersonName(e.target.value); setSelectedPersonId(""); }} placeholder="Or type a new name" className={inputClass} />
                  <div className="flex gap-2">
                    <button type="button" onClick={handleAddPerson} disabled={!selectedPersonId && !newPersonName.trim()} className="rounded-full bg-accent hover:bg-accent-hover text-white text-xs font-medium py-2 px-4 disabled:opacity-50">Add</button>
                    <button type="button" onClick={() => setShowAddPerson(false)} className="text-xs text-text-muted">Cancel</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setShowAddPerson(true)} className="text-xs text-accent hover:text-accent-hover">+ Add host or speaker</button>
              )}
            </div>
          </Section>
        </div>
      )}

      {/* ── Collapsible: Publishing ── */}
      {isEdit && (
        <div className="rounded-2xl border border-border bg-bg-card px-5 mb-4">
          <Section title="Publishing" badge={isPublic ? "Public" : "Draft"}>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <button type="button" role="switch" aria-checked={isPublic} onClick={() => setIsPublic(!isPublic)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isPublic ? "bg-accent" : "bg-bg-elevated"}`}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isPublic ? "translate-x-[18px]" : "translate-x-1"}`} />
                </button>
                <span className="text-sm text-text-primary">{isPublic ? "Public — visible in API" : "Private — hidden from API"}</span>
              </label>
              {shareToken && (
                <div className="flex items-center gap-2">
                  <input readOnly value={`${typeof window !== "undefined" ? window.location.origin : ""}/preview/${shareToken}`} className="flex-1 rounded-xl border border-border bg-bg-base px-3 py-2 text-text-muted text-xs font-mono" />
                  <button type="button" onClick={copyShareLink} className="text-xs text-accent hover:text-accent-hover">Copy</button>
                  <button type="button" onClick={handleRegenToken} className="text-xs text-text-muted hover:text-text-secondary">Regen</button>
                </div>
              )}
            </div>
          </Section>
        </div>
      )}

      {/* ── Collapsible: Distribution ── */}
      {isEdit && (
        <div className="rounded-2xl border border-border bg-bg-card px-5 mb-4">
          <Section title="Distribution" badge={event.distributions?.length ? `${event.distributions.length} platforms` : undefined}>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button type="button" onClick={copyWhatsApp} className="rounded-full bg-[#25D366] hover:bg-[#1da851] text-white font-medium text-xs py-2 px-4 transition-colors flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  {copiedWhatsApp ? "Copied!" : "Copy for WhatsApp"}
                </button>
                <button type="button" onClick={copyInstagram} className="rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] hover:opacity-90 text-white font-medium text-xs py-2 px-4 transition-opacity flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  {copiedInstagram ? "Copied!" : "Copy for Instagram"}
                </button>
              </div>

              {event.distributions && event.distributions.length > 0 && (
                <div className="space-y-1.5">
                  {event.distributions.map((dist: Distribution) => (
                    <div key={dist.id} className="flex items-center gap-3 rounded-xl border border-border px-4 py-2.5">
                      <span className="text-sm font-medium text-text-primary">{dist.platform}</span>
                      {dist.url && <a href={dist.url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent truncate max-w-[200px]">{dist.url}</a>}
                      <span className="text-xs text-text-muted ml-auto">{new Date(dist.postedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      <button type="button" onClick={() => handleRemoveDistribution(dist.id)} className="text-text-muted hover:text-red-600 text-xs">&times;</button>
                    </div>
                  ))}
                </div>
              )}

              {showAddDist ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_PLATFORMS.filter((p) => !event.distributions?.some((d: Distribution) => d.platform === p)).map((p) => (
                      <button key={p} type="button" onClick={() => setNewPlatform(p)} className={`rounded-full px-3 py-1 text-xs font-medium ${newPlatform === p ? "bg-accent text-white" : "bg-bg-elevated text-text-secondary"}`}>{p}</button>
                    ))}
                  </div>
                  <input type="text" value={newPlatform} onChange={(e) => setNewPlatform(e.target.value)} placeholder="Platform name" className={inputClass} />
                  <input type="url" value={newPlatformUrl} onChange={(e) => setNewPlatformUrl(e.target.value)} placeholder="Link (optional)" className={inputClass} />
                  <div className="flex gap-2">
                    <button type="button" onClick={handleAddDistribution} disabled={!newPlatform.trim()} className="rounded-full bg-accent text-white text-xs font-medium py-2 px-4 disabled:opacity-50">Add</button>
                    <button type="button" onClick={() => { setShowAddDist(false); setNewPlatform(""); setNewPlatformUrl(""); }} className="text-xs text-text-muted">Cancel</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setShowAddDist(true)} className="text-xs text-accent hover:text-accent-hover">+ Mark as posted</button>
              )}
            </div>
          </Section>
        </div>
      )}

      {/* ── Platform Sync ── */}
      {isEdit && (
        <div className="rounded-2xl border border-border bg-bg-card px-5 mb-4">
          <Section title="NāM Platform" badge={isSynced ? "Synced" : undefined}>
            <div className="space-y-4">
              {!isSynced ? (
                <div className="space-y-3">
                  <p className="text-xs text-text-muted">
                    Publish this event to the NāM Platform so members can discover it and RSVP.
                  </p>
                  <button
                    type="button"
                    onClick={handleSync}
                    disabled={syncing}
                    className="rounded-full bg-accent hover:bg-accent-hover text-white font-medium text-xs py-2 px-4 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {syncing ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                        Syncing...
                      </>
                    ) : (
                      <>
                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a.75.75 0 01.75.75v5.59l1.95-2.1a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0L6.2 7.26a.75.75 0 111.1-1.02l1.95 2.1V2.75A.75.75 0 0110 2z"/><path d="M5.273 4.5a1.25 1.25 0 00-1.205.918l-1.523 5.52c-.006.02-.01.041-.015.062H6a1.25 1.25 0 011.2.9l.3 1.1h5l.3-1.1A1.25 1.25 0 0114 11h3.47a1.318 1.318 0 00-.015-.062l-1.523-5.52a1.25 1.25 0 00-1.205-.918h-.558a.75.75 0 010-1.5h.558a2.75 2.75 0 012.651 2.019l1.523 5.52c.066.239.099.485.099.733V15a2.25 2.25 0 01-2.25 2.25H3.25A2.25 2.25 0 011 15v-3.228c0-.248.033-.494.099-.733l1.523-5.52A2.75 2.75 0 015.273 3.5h.558a.75.75 0 010 1z"/></svg>
                        Publish to Platform
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Live on Platform
                    </span>
                    {event?.platformSyncedAt && (
                      <span className="text-xs text-text-muted">
                        Last synced {new Date(event.platformSyncedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </span>
                    )}
                  </div>

                  {/* Attendance */}
                  {attendance && (
                    <div className="rounded-xl border border-border bg-bg-base p-4">
                      <div className="flex items-center gap-6 mb-3">
                        <div>
                          <span className="text-2xl font-semibold text-text-primary">{attendance.goingCount}</span>
                          <span className="text-xs text-text-muted ml-1.5">going</span>
                        </div>
                        <div>
                          <span className="text-2xl font-semibold text-text-primary">{attendance.interestedCount}</span>
                          <span className="text-xs text-text-muted ml-1.5">interested</span>
                        </div>
                      </div>
                      {attendance.attendees.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {attendance.attendees.map((a) => (
                            <div key={a.displayName} className="flex items-center gap-1.5 rounded-full bg-bg-elevated px-2.5 py-1">
                              {a.avatarUrl ? (
                                <img src={a.avatarUrl} alt="" className="h-4 w-4 rounded-full object-cover" />
                              ) : (
                                <span className="h-4 w-4 rounded-full bg-accent/20 flex items-center justify-center text-[8px] font-bold text-accent">
                                  {a.displayName.charAt(0)}
                                </span>
                              )}
                              <span className="text-xs text-text-primary">{a.displayName}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSync}
                      disabled={syncing}
                      className="rounded-full border border-border text-text-secondary font-medium text-xs py-2 px-4 hover:border-text-secondary transition-colors disabled:opacity-50"
                    >
                      {syncing ? "Syncing..." : "Re-sync"}
                    </button>
                    <button
                      type="button"
                      onClick={handleUnsync}
                      disabled={syncing}
                      className="text-xs text-text-muted hover:text-red-600"
                    >
                      Unpublish
                    </button>
                  </div>
                </div>
              )}
              {syncError && <p className="text-xs text-red-600">{syncError}</p>}
            </div>
          </Section>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center gap-3 pt-6 pb-12">
        <button type="submit" className="rounded-full bg-accent hover:bg-accent-hover text-white font-mono text-[13px] font-medium py-2.5 px-6 transition-colors">
          {isEdit ? "Save Changes" : "Create Event"}
        </button>
        {isEdit && (
          <>
            <div className="flex-1" />
            {showDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600">Delete?</span>
                <button type="button" onClick={() => deleteEvent(event.id)} className="rounded-full bg-red-600 text-white text-xs py-2 px-4">Confirm</button>
                <button type="button" onClick={() => setShowDelete(false)} className="text-xs text-text-muted">Cancel</button>
              </div>
            ) : (
              <button type="button" onClick={() => setShowDelete(true)} className="text-xs text-text-muted hover:text-red-600">Delete event</button>
            )}
          </>
        )}
      </div>

      </div>{/* close max-w-2xl wrapper */}
    </form>
  );
}
