import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/venues — list all venues
export async function GET() {
  const venues = await prisma.venue.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { events: true } } },
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

// PUT /api/venues — update a venue
export async function PUT(req: NextRequest) {
  const { id, name, address, mapsUrl, photo, notes } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }
  if (!name || name.trim().length < 1) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const venue = await prisma.venue.update({
    where: { id },
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

// DELETE /api/venues — delete a venue
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  // Unlink events first
  await prisma.event.updateMany({
    where: { venueId: id },
    data: { venueId: null },
  });

  await prisma.venue.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
