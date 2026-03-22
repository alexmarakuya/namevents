import { PrismaClient } from "@/generated/prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
  const event = await prisma.event.create({
    data: {
      title: "Consciousness, Code & Creativity",
      entity: "AI_MEETUP",
      format: "MEETUP",
      stage: "ANNOUNCED",
      public: true,
      date: new Date("2026-03-24T10:30:00"),
      endDate: new Date("2026-03-24T13:00:00"),
      venueId: "cmmyc0pcr0000t2p4nnly8sma",
      shortBlurb: "A panel discussion on AI, human intelligence & what it means to be alive. Join three voices at the intersection of technology, community, and human experience.",
      description: `What happens when machines can write, create, and relate… and do it well?

This is a conversation about the edge between consciousness and code, between creation and discovery, between who we are and who we are becoming.

Schedule:
10:30 — Meet & Greet
11:00 — Panel Discussion (about an hour)
12:00 — Breakout Groups — smaller conversations picking up where the panel left off

We'll explore four threads: the nature of consciousness and creativity, AI as mirror or doorway, the tensions it introduces in our relationships and sense of meaning, and the question of co-creation. What does it look like when AI becomes a collaborator rather than a replacement?

Honest questions, good people, and a space to think out loud.`,
      tags: ["ai", "consciousness", "creativity", "panel", "community"],
      shareToken: randomUUID(),
      people: {
        create: [
          { personId: "cmn11faes0000rop4wlm18ng4", role: "HOST", customTitle: "Moderator, Founder of Oxyzn", order: 0 },
          { personId: "sp_aaron", role: "SPEAKER", customTitle: "Copywriter & Creative Technologist", order: 1 },
          { personId: "sp_nicole", role: "SPEAKER", customTitle: "Relational AI & Human Connection", order: 2 },
          { personId: "sp_olaf", role: "SPEAKER", customTitle: "Community Builder & Global Tribe Connector", order: 3 },
        ]
      }
    },
    include: { people: { include: { person: true } }, venue: true }
  });

  console.log("Created:", event.title);
  console.log("ID:", event.id);
  console.log("Share token:", event.shareToken);
  console.log("Stage:", event.stage);
  console.log("People:", event.people.map(p => `${p.person.name} (${p.role})`).join(", "));

  await prisma.$disconnect();
}

main();
