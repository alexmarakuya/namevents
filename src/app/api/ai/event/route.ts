import { NextRequest, NextResponse } from "next/server";
import { generateEventCopy } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === "placeholder" || apiKey.length < 20) {
      return NextResponse.json({
        title: "",
        description: "",
        error: "AI not configured",
      });
    }

    const body = await req.json();
    const { rawDescription, entity, format, date, location, tone } = body;

    if (!rawDescription || rawDescription.trim().length < 5) {
      return NextResponse.json(
        { error: "Please describe the event in a few words." },
        { status: 400 }
      );
    }

    const result = await generateEventCopy({
      rawDescription,
      entity: entity || "EXTERNAL",
      format: format || "SOCIAL",
      date,
      location,
      tone: tone || "warm",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Event AI generation failed:", error);
    return NextResponse.json(
      { error: "Something went wrong. Try again or write manually." },
      { status: 500 }
    );
  }
}
