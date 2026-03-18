import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { v4 as uuid } from "uuid";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  await prisma.event.deleteMany();

  const events = [
    {
      title: "AI Meetup Phangan #3",
      entity: "AI_MEETUP" as const,
      format: "MEETUP" as const,
      stage: "CONFIRMED" as const,
      date: new Date("2026-04-15T18:00:00Z"),
      endDate: new Date("2026-04-15T21:00:00Z"),
      location: "Kin Haus, Koh Phangan",
      locationUrl: "https://maps.google.com/?q=Kin+Haus+Koh+Phangan",
      shortBlurb: "The island's AI community gathers for demos, talks, and good conversations over drinks.",
      description: "Join us for the third AI Meetup Phangan. This time we're exploring practical AI tools for creators and builders. Lightning talks, live demos, and plenty of time to connect.\n\nBring your laptop if you want to show something.",
      tags: ["AI", "community", "tech", "demos"],
      coHosts: ["Kin Haus"],
      capacity: 30,
      public: true,
    },
    {
      title: "Full Moon Social",
      entity: "KIN_HAUS" as const,
      format: "SOCIAL" as const,
      stage: "BREWING" as const,
      date: new Date("2026-04-12T19:00:00Z"),
      location: "Kin Haus Rooftop",
      shortBlurb: "Rooftop drinks and music under the full moon.",
      tags: ["social", "full moon", "music"],
      public: false,
    },
    {
      title: "Design Sprint Workshop",
      entity: "NAM_STUDIO" as const,
      format: "WORKSHOP" as const,
      stage: "SEED" as const,
      shortBlurb: "A two-day design sprint for founders with real products.",
      tags: ["design", "workshop", "founders"],
      public: false,
    },
    {
      title: "Acoustic Sunset Session",
      entity: "KIN_HAUS" as const,
      format: "PERFORMANCE" as const,
      stage: "ANNOUNCED" as const,
      date: new Date("2026-03-28T17:30:00Z"),
      endDate: new Date("2026-03-28T20:00:00Z"),
      location: "Kin Haus Garden",
      shortBlurb: "Live acoustic music as the sun goes down. Local musicians, cold drinks, warm vibes.",
      description: "Every last Friday of the month, we host local musicians in the Kin Haus garden. No cover charge — just show up, grab a drink, and enjoy the music.\n\nThis month featuring Mika and the Coconuts.",
      tags: ["music", "acoustic", "sunset"],
      capacity: 50,
      public: true,
    },
    {
      title: "Co-working Beta Launch",
      entity: "NAM_SPACE" as const,
      format: "COMMUNITY" as const,
      stage: "BREWING" as const,
      date: new Date("2026-05-01T09:00:00Z"),
      location: "NāM Space, Koh Phangan",
      shortBlurb: "The first day of NāM Space. Come work, meet the community, and help shape the space.",
      tags: ["co-working", "launch", "community"],
      notes: "Need to confirm internet installation date. Check with Paulo about furniture delivery.",
      public: false,
    },
    {
      title: "Island Entrepreneur Dinner",
      entity: "EXTERNAL" as const,
      format: "SOCIAL" as const,
      stage: "DONE" as const,
      date: new Date("2026-02-20T19:00:00Z"),
      location: "The Fisherman's Restaurant",
      shortBlurb: "Monthly dinner for island founders and builders.",
      tags: ["networking", "dinner", "founders"],
      coHosts: ["Digital Phangan"],
      public: true,
    },
  ];

  for (const event of events) {
    await prisma.event.create({
      data: {
        ...event,
        slug: slugify(event.title),
        shareToken: uuid(),
      },
    });
  }

  console.log(`Seeded ${events.length} events`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
