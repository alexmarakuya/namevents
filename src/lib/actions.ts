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
      capacity: formData.get("capacity") ? parseInt(formData.get("capacity") as string, 10) : null,
      registrationUrl: (formData.get("registrationUrl") as string) || null,
      externalUrl: (formData.get("externalUrl") as string) || null,
      notes: (formData.get("notes") as string) || null,
      public: formData.get("public") === "true",
      shareToken: uuid(),
    },
  });

  revalidatePath("/dashboard");
  redirect(`/events/${event.id}`);
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
  await prisma.event.update({
    where: { id },
    data: { stage },
  });
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
