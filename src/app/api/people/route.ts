import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/people — list all people with event counts
export async function GET() {
  const people = await prisma.person.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { events: true } },
      events: {
        include: { event: { select: { id: true, title: true, date: true, entity: true } } },
        orderBy: { event: { date: "desc" } },
      },
    },
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

// PUT /api/people — update a person
export async function PUT(req: NextRequest) {
  const { id, name, email, photo, bio, website, instagram, linkedin } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }
  if (!name || name.trim().length < 1) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const person = await prisma.person.update({
    where: { id },
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

// DELETE /api/people — delete a person
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  // Remove event links first
  await prisma.eventPerson.deleteMany({ where: { personId: id } });
  await prisma.person.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
