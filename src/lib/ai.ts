import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// --- Schemas ---

export const eventCopySchema = z.object({
  title: z
    .string()
    .max(120)
    .describe("A catchy, concise event title (max 10 words)"),
  description: z
    .string()
    .max(2000)
    .describe(
      "2-3 short paragraphs of engaging event copy. Warm and inviting, not corporate."
    ),
});

export const blurbSchema = z.object({
  blurb: z
    .string()
    .max(280)
    .describe(
      "A 1-2 sentence teaser that captures the vibe and makes people want to come"
    ),
});

export const tagsSchema = z.object({
  tags: z
    .array(z.string())
    .min(3)
    .max(10)
    .describe(
      "Lowercase tags relevant to this event — mix of topic, format, and vibe"
    ),
});

// --- System Prompts ---

const EVENT_SYSTEM = `You write event listings for NāM — a creative, design-led community on Koh Phangan, Thailand. NāM operates across co-living (Kin Haus), tech meetups (AI Meetup Phangan), island connections, and a co-working campus (NāM Space).

Given a rough event description and details, generate a title and description.

Rules:
- Sound like a real person, not a marketing bot
- Mention key details (time, place, price) naturally in the description
- Keep it concise — people scan, not read
- No hashtags in the copy
- No emojis in the title
- No clichés like "join us for an amazing evening" or "don't miss out"
- Match the requested tone`;

const BLURB_SYSTEM = `You write short event teasers for NāM — a creative community on Koh Phangan, Thailand.

Given an event title and description, write a 1-2 sentence teaser that captures the vibe and makes people want to come.

Rules:
- Maximum 2 sentences
- Warm and specific — mention what actually happens
- No generic filler
- No emojis
- Match the event's energy`;

const TAGS_SYSTEM = `You suggest tags for events at NāM — a creative community on Koh Phangan, Thailand.

Given an event's title, description, entity, and format, return 5-8 lowercase tags that capture the topic, format, vibe, and audience.

Rules:
- All lowercase, no # symbol
- Simple words or two-word phrases (e.g. "ai", "community", "live music", "web3", "wellness")
- Mix of topic tags and vibe tags
- Order by relevance — most relevant first
- No generic filler like "fun" or "great"`;

// --- Tone Instructions ---

const TONE_INSTRUCTIONS: Record<string, string> = {
  warm: "Write like a friend posting about something cool happening. Warm, approachable, no hype.",
  informative:
    "Write clearly with practical details first. Structured but still human. No corporate tone.",
  hype: "Write with enthusiasm and excitement. Use punchy sentences. Make people feel the energy. But stay specific — no empty hype.",
  minimal:
    "Write with a laid-back confidence. Short sentences, no filler. Think cool and understated.",
};

// --- Generators ---

export async function generateEventCopy(input: {
  rawDescription: string;
  entity: string;
  format: string;
  date?: string | null;
  location?: string | null;
  tone: string;
}) {
  const toneInstruction =
    TONE_INSTRUCTIONS[input.tone] || TONE_INSTRUCTIONS.warm;

  const prompt = `Tone: ${toneInstruction}

Event details:
- What: ${input.rawDescription}
- Entity: ${input.entity}
- Format: ${input.format}
- Date: ${input.date || "TBD"}
- Location: ${input.location || "TBD"}

Write a title and description for this event.`;

  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: eventCopySchema,
    system: EVENT_SYSTEM,
    prompt,
  });

  return object;
}

export async function generateBlurb(input: {
  title: string;
  description?: string | null;
  entity: string;
  format: string;
}) {
  const prompt = `Event: ${input.title}
Entity: ${input.entity}
Format: ${input.format}
${input.description ? `Description: ${input.description}` : ""}

Write a short teaser for this event.`;

  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: blurbSchema,
    system: BLURB_SYSTEM,
    prompt,
  });

  return object;
}

export async function generateTags(input: {
  title: string;
  description?: string | null;
  entity: string;
  format: string;
}) {
  const prompt = `Suggest tags for this event:

Title: ${input.title}
Entity: ${input.entity}
Format: ${input.format}
${input.description ? `Description: ${input.description}` : ""}`;

  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: tagsSchema,
    system: TAGS_SYSTEM,
    prompt,
  });

  return object;
}
