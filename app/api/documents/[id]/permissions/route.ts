import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const doc = await prisma.document.findUnique({
    where: { id },
    select: { ownerId: true },
  });

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (doc.ownerId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const permissions = await prisma.documentPermission.findMany({
    where: { documentId: id },
    include: { user: { select: { name: true, email: true } } },
  });

  return NextResponse.json(permissions);
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
    select: { ownerId: true },
  });

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (doc.ownerId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email, role } = await req.json();

  if (!email || !role || !Object.values(Role).includes(role)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (targetUser.id === userId) {
    return NextResponse.json(
      { error: "Cannot change your own permission" },
      { status: 400 }
    );
  }

  const permission = await prisma.documentPermission.upsert({
    where: { documentId_userId: { documentId: id, userId: targetUser.id } },
    update: { role },
    create: { documentId: id, userId: targetUser.id, role },
  });

  return NextResponse.json(permission);
}

export async function DELETE(
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
    select: { ownerId: true },
  });

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (doc.ownerId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const targetUserId = req.nextUrl.searchParams.get("userId");
  if (!targetUserId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  await prisma.documentPermission.deleteMany({
    where: { documentId: id, userId: targetUserId },
  });

  return NextResponse.json({ success: true });
}
