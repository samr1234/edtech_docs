import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { handleError } from "@/lib/api-error";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    const body = await req.json().catch(() => ({}));
    const { email, role } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    if (!role || !Object.values(Role).includes(role)) {
      return NextResponse.json(
        { error: `Role must be one of: ${Object.values(Role).join(", ")}` },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "No account found with that email address" },
        { status: 404 }
      );
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
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
      return NextResponse.json({ error: "userId query parameter is required" }, { status: 400 });
    }

    await prisma.documentPermission.deleteMany({
      where: { documentId: id, userId: targetUserId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
