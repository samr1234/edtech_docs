import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const documents = await prisma.document.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { permissions: { some: { userId } } },
      ],
    },
    include: {
      owner: { select: { name: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(documents);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = body.title || "Untitled";

  const document = await prisma.document.create({
    data: {
      title,
      ownerId: session.user.id,
    },
  });

  return NextResponse.json(document, { status: 201 });
}
