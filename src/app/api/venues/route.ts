import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/venues — list all venues (for autocomplete)
export async function GET() {
  const venues = await prisma.venue.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ venues });
}

// POST /api/venues — create a new venue
export async function POST(req: NextRequest) {
  const { name, address, mapsUrl, photo, notes } = await req.json();

  if (!name || name.trim().length < 1) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const venue = await prisma.venue.create({
    data: {
      name: name.trim(),
      address: address?.trim() || null,
      mapsUrl: mapsUrl?.trim() || null,
      photo: photo?.trim() || null,
      notes: notes?.trim() || null,
    },
  });

  return NextResponse.json(venue);
}
