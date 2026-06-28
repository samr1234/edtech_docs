import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  const doc = await prisma.document.findUnique({
    where: { id },
    select: {
      ownerId: true,
      permissions: { where: { userId }, select: { role: true } },
    },
  });

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const hasAccess = doc.ownerId === userId || doc.permissions.length > 0;
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const versions = await prisma.version.findMany({
    where: { documentId: id },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(versions);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  const doc = await prisma.document.findUnique({
    where: { id },
    select: {
      ownerId: true,
      permissions: { where: { userId }, select: { role: true } },
    },
  });

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = doc.ownerId === userId;
  const permission = doc.permissions[0];
  if (!isOwner && (!permission || permission.role === "VIEWER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { label, snapshot } = await req.json();

  if (!Array.isArray(snapshot)) {
    return NextResponse.json({ error: "Invalid snapshot" }, { status: 400 });
  }
  if (snapshot.length > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Snapshot too large (max 10 MB)" }, { status: 413 });
  }

  const sanitizedLabel =
    typeof label === "string" ? label.trim().slice(0, 200) : null;

  const version = await prisma.version.create({
    data: {
      documentId: id,
      userId,
      label: sanitizedLabel || null,
      snapshot: Buffer.from(snapshot),
    },
  }).catch(() => {
    return null;
  });

  if (!version) return NextResponse.json({ error: "Failed to save version" }, { status: 500 });

  return NextResponse.json(version, { status: 201 });
}
