import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/api-error";

export async function GET() {
  try {
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
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 500) || "Untitled" : "Untitled";

    const document = await prisma.document.create({
      data: {
        title,
        ownerId: session.user.id,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
