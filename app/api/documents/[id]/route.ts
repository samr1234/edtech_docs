import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { handleError } from "@/lib/api-error";

async function getUserRole(
  docId: string,
  userId: string
): Promise<"OWNER" | Role | null> {
  const doc = await prisma.document.findUnique({
    where: { id: docId },
    select: {
      ownerId: true,
      permissions: { where: { userId }, select: { role: true } },
    },
  });

  if (!doc) return null;
  if (doc.ownerId === userId) return "OWNER";
  if (doc.permissions.length > 0) return doc.permissions[0].role;
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const role = await getUserRole(id, session.user.id);
    if (!role) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        owner: { select: { name: true, email: true } },
        permissions: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
    });

    return NextResponse.json({ ...document, role });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const role = await getUserRole(id, session.user.id);
    if (!role || role === "VIEWER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 500) : undefined;
    if (title === undefined) {
      return NextResponse.json({ error: "Invalid title" }, { status: 400 });
    }

    const document = await prisma.document.update({
      where: { id },
      data: { title: title || "Untitled" },
    });

    return NextResponse.json(document);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const role = await getUserRole(id, session.user.id);
    if (role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.document.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
