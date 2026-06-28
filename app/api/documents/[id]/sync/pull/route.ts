import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/api-error";

export async function GET(
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
    const clientId = req.headers.get("x-client-id") ?? "";
    const rawSince = parseInt(req.nextUrl.searchParams.get("since") ?? "0", 10);
    const since = isNaN(rawSince) ? 0 : Math.max(0, rawSince);

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

    const hasAccess = doc.ownerId === userId || doc.permissions.length > 0;
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const operations = await prisma.operation.findMany({
      where: {
        documentId: id,
        version: { gt: since },
        clientId: { not: clientId },
      },
      orderBy: { version: "asc" },
      take: 1000,
    });

    const updates = operations.map((op) => ({
      id: op.id,
      update: Array.from(op.update),
      version: op.version,
      clientId: op.clientId,
    }));

    const returnedVersion =
      operations.length > 0
        ? operations[operations.length - 1].version
        : doc.version;

    return NextResponse.json({ updates, serverVersion: returnedVersion });
  } catch (err) {
    return handleError(err);
  }
}
