"use server";

import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { v4 as uuid } from "uuid";
import type { Entity, EventFormat, EventStage } from "@/generated/prisma/client";

export async function createEvent(formData: FormData) {
  const title = formData.get("title") as string;
  if (!title) throw new Error("Title is required");

  let slug = slugify(title);
  // Ensure unique slug
  const existing = await prisma.event.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const event = await prisma.event.create({
    data: {
      title,
      slug,
      entity: (formData.get("entity") as Entity) || "EXTERNAL",
      format: (formData.get("format") as EventFormat) || "SOCIAL",
      stage: (formData.get("stage") as EventStage) || "SEED",
      date: formData.get("date") ? new Date(formData.get("date") as string) : null,
      endDate: formData.get("endDate") ? new Date(formData.get("endDate") as string) : null,
      location: (formData.get("location") as string) || null,
      locationUrl: (formData.get("locationUrl") as string) || null,
      description: (formData.get("description") as string) || null,
      shortBlurb: (formData.get("shortBlurb") as string) || null,
      coverImage: (formData.get("coverImage") as string) || null,
      tags: formData.get("tags") ? (formData.get("tags") as string).split(",").map((t) => t.trim()).filter(Boolean) : [],
      coHosts: formData.get("coHosts") ? (formData.get("coHosts") as string).split(",").map((t) => t.trim()).filter(Boolean) : [],
      price: (formData.get("price") as string) || null,
      capacity: formData.get("capacity") ? parseInt(formData.get("capacity") as string, 10) : null,
      registrationUrl: (formData.get("registrationUrl") as string) || null,
      externalUrl: (formData.get("externalUrl") as string) || null,
      notes: (formData.get("notes") as string) || null,
      public: formData.get("public") === "true",
      shareToken: uuid(),
    },
  });

  revalidatePath("/dashboard");
  const fromWizard = formData.get("fromWizard") === "true";
  redirect(`/events/${event.id}${fromWizard ? "?ai=1" : ""}`);
}

export async function updateEvent(id: string, formData: FormData) {
  const title = formData.get("title") as string;
  if (!title) throw new Error("Title is required");

  const currentEvent = await prisma.event.findUnique({ where: { id } });
  if (!currentEvent) throw new Error("Event not found");

  // Only regenerate slug if title changed and slug wasn't manually set
  let slug = currentEvent.slug;
  const newSlug = formData.get("slug") as string;
  if (newSlug && newSlug !== slug) {
    slug = slugify(newSlug);
    const existing = await prisma.event.findFirst({
      where: { slug, NOT: { id } },
    });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;
  }

  await prisma.event.update({
    where: { id },
    data: {
      title,
      slug,
      entity: (formData.get("entity") as Entity) || currentEvent.entity,
      format: (formData.get("format") as EventFormat) || currentEvent.format,
      stage: (formData.get("stage") as EventStage) || currentEvent.stage,
      date: formData.get("date") ? new Date(formData.get("date") as string) : null,
      endDate: formData.get("endDate") ? new Date(formData.get("endDate") as string) : null,
      location: (formData.get("location") as string) || null,
      locationUrl: (formData.get("locationUrl") as string) || null,
      description: (formData.get("description") as string) || null,
      shortBlurb: (formData.get("shortBlurb") as string) || null,
      coverImage: (formData.get("coverImage") as string) || null,
      tags: formData.get("tags") ? (formData.get("tags") as string).split(",").map((t) => t.trim()).filter(Boolean) : [],
      coHosts: formData.get("coHosts") ? (formData.get("coHosts") as string).split(",").map((t) => t.trim()).filter(Boolean) : [],
      price: (formData.get("price") as string) || null,
      capacity: formData.get("capacity") ? parseInt(formData.get("capacity") as string, 10) : null,
      registrationUrl: (formData.get("registrationUrl") as string) || null,
      externalUrl: (formData.get("externalUrl") as string) || null,
      notes: (formData.get("notes") as string) || null,
      public: formData.get("public") === "true",
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/events/${id}`);
  redirect(`/events/${id}`);
}

export async function updateEventStage(id: string, stage: EventStage) {
  const data: Record<string, unknown> = { stage };

  // Auto-set public when ANNOUNCED
  if (stage === "ANNOUNCED") {
    data.public = true;
  }

  await prisma.event.update({ where: { id }, data });

  // Auto-sync to platform when ANNOUNCED
  if (stage === "ANNOUNCED") {
    try {
      await syncToPlatform(id);
    } catch (err) {
      console.error("Auto-sync to platform failed:", err);
    }
  }

  // Auto-unsync when CANCELLED
  if (stage === "CANCELLED") {
    try {
      await unsyncFromPlatform(id);
    } catch (err) {
      console.error("Auto-unsync from platform failed:", err);
    }
  }

  revalidatePath("/dashboard");
}

export async function deleteEvent(id: string) {
  await prisma.event.delete({ where: { id } });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function regenerateShareToken(id: string) {
  const event = await prisma.event.update({
    where: { id },
    data: { shareToken: uuid() },
  });
  revalidatePath(`/events/${id}`);
  return event.shareToken;
}

// Distribution actions

export async function addDistribution(
  eventId: string,
  platform: string,
  url: string | null
) {
  await prisma.distribution.create({
    data: {
      eventId,
      platform,
      url: url || null,
    },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function updateDistribution(
  id: string,
  eventId: string,
  data: { platform?: string; url?: string | null }
) {
  await prisma.distribution.update({
    where: { id },
    data,
  });
  revalidatePath(`/events/${eventId}`);
}

export async function removeDistribution(id: string, eventId: string) {
  await prisma.distribution.delete({ where: { id } });
  revalidatePath(`/events/${eventId}`);
}

// Event Person (Host/Speaker) actions

export async function addEventPerson(
  eventId: string,
  personId: string,
  role: "HOST" | "SPEAKER"
) {
  await prisma.eventPerson.create({
    data: { eventId, personId, role },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function removeEventPerson(id: string, eventId: string) {
  await prisma.eventPerson.delete({ where: { id } });
  revalidatePath(`/events/${eventId}`);
}

// Venue actions

export async function setEventVenue(eventId: string, venueId: string | null) {
  await prisma.event.update({
    where: { id: eventId },
    data: { venueId },
  });
  revalidatePath(`/events/${eventId}`);
}

// Platform sync actions

function formatTime12h(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  return `${h}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

export async function syncToPlatform(eventId: string) {
  const platformUrl = process.env.NAM_PLATFORM_URL;
  const syncSecret = process.env.NAM_PLATFORM_SYNC_SECRET;

  if (!platformUrl || !syncSecret) {
    throw new Error("Platform sync not configured. Set NAM_PLATFORM_URL and NAM_PLATFORM_SYNC_SECRET.");
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { venue: true },
  });

  if (!event) throw new Error("Event not found");

  const res = await fetch(`${platformUrl}/api/events/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${syncSecret}`,
    },
    body: JSON.stringify({
      sourceId: event.id,
      title: event.title,
      description: event.description,
      date: event.date ? event.date.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      startTime: event.date ? formatTime12h(event.date) : null,
      endTime: event.endDate ? formatTime12h(event.endDate) : null,
      price: event.price || null,
      venue: event.venue?.name || event.location || null,
      entryType: event.registrationUrl ? "rsvp" : "walk-in",
      imageUrl: event.coverImage || null,
      externalUrl: event.externalUrl || null,
      interests: event.tags,
      isPublished: true,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Sync failed: ${err.error || res.statusText}`);
  }

  const result = await res.json();

  // Store the platform event ID
  await prisma.event.update({
    where: { id: eventId },
    data: {
      platformEventId: result.event.id,
      platformSyncedAt: new Date(),
    },
  });

  revalidatePath(`/events/${eventId}`);
  return result;
}

export async function unsyncFromPlatform(eventId: string) {
  const platformUrl = process.env.NAM_PLATFORM_URL;
  const syncSecret = process.env.NAM_PLATFORM_SYNC_SECRET;

  if (!platformUrl || !syncSecret) {
    throw new Error("Platform sync not configured.");
  }

  const res = await fetch(`${platformUrl}/api/events/sync`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${syncSecret}`,
    },
    body: JSON.stringify({ sourceId: eventId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Unsync failed: ${err.error || res.statusText}`);
  }

  await prisma.event.update({
    where: { id: eventId },
    data: {
      platformEventId: null,
      platformSyncedAt: null,
    },
  });

  revalidatePath(`/events/${eventId}`);
}

export async function fetchPlatformAttendance(eventId: string) {
  const platformUrl = process.env.NAM_PLATFORM_URL;
  const syncSecret = process.env.NAM_PLATFORM_SYNC_SECRET;

  if (!platformUrl || !syncSecret) {
    return null;
  }

  const res = await fetch(
    `${platformUrl}/api/events/sync/attendance?sourceId=${eventId}`,
    {
      headers: { Authorization: `Bearer ${syncSecret}` },
      next: { revalidate: 60 }, // Cache for 60 seconds
    }
  );

  if (!res.ok) return null;

  return res.json() as Promise<{
    platformEventId: string;
    goingCount: number;
    interestedCount: number;
    attendees: {
      userId: string;
      status: string;
      displayName: string;
      avatarUrl: string | null;
      rsvpAt: string;
    }[];
  }>;
}
