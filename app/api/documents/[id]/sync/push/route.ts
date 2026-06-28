import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const { id } = await params;
  const userId = session.user.id;

  const doc = await prisma.document.findUnique({
    where: { id },
    select: {
      ownerId: true,
      version: true,
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

  const body = await req.json();
  const { updates } = body;

  if (!Array.isArray(updates) || updates.length > 1000) {
    return NextResponse.json({ error: "Invalid updates" }, { status: 400 });
  }

  const acknowledgedIds: number[] = [];
  let currentVersion = doc.version;

  for (const u of updates) {
    if (!Array.isArray(u.update)) continue;
    // Reject individual updates larger than 1 MB (number arrays)
    if (u.update.length > 1024 * 1024) {
      return NextResponse.json({ error: "Update too large" }, { status: 413 });
    }
    currentVersion += 1;
    await prisma.operation.create({
      data: {
        documentId: id,
        userId,
        update: Buffer.from(u.update),
        version: currentVersion,
        clientId: u.clientId,
      },
    });
    if (u.id != null) acknowledgedIds.push(u.id);
  }

  await prisma.document.update({
    where: { id },
    data: { version: currentVersion },
  });

  return NextResponse.json({ acknowledgedIds, serverVersion: currentVersion });
}
