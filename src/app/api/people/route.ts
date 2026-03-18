import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/people — list all people (for autocomplete)
export async function GET() {
  const people = await prisma.person.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ people });
}

// POST /api/people — create a new person
export async function POST(req: NextRequest) {
  const { name, email, photo, bio, website, instagram, linkedin } = await req.json();

  if (!name || name.trim().length < 1) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const person = await prisma.person.create({
    data: {
      name: name.trim(),
      email: email?.trim() || null,
      photo: photo?.trim() || null,
      bio: bio?.trim() || null,
      website: website?.trim() || null,
      instagram: instagram?.trim() || null,
      linkedin: linkedin?.trim() || null,
    },
  });

  return NextResponse.json(person);
}
