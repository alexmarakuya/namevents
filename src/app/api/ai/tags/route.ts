import { NextRequest, NextResponse } from "next/server";
import { generateTags } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === "placeholder" || apiKey.length < 20) {
      return NextResponse.json({ tags: [], error: "AI not configured" });
    }

    const { title, description, entity, format } = await req.json();

    if (!title || title.trim().length < 3) {
      return NextResponse.json(
        { error: "Need at least a title to suggest tags." },
        { status: 400 }
      );
    }

    const result = await generateTags({
      title,
      description,
      entity: entity || "EXTERNAL",
      format: format || "SOCIAL",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Tags AI generation failed:", error);
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}
