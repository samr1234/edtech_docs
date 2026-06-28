import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/api-error";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const userId = session.user.id;

    const doc = await prisma.document.findUnique({
      where: { id },
      select: {
        ownerId: true,
        permissions: { where: { userId }, select: { role: true } },
      },
    });

    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const hasAccess = doc.ownerId === userId || doc.permissions.length > 0;
    if (!hasAccess)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { content, action } = body;

    if (!content || typeof content !== "string" || content.length > 50000) {
      return NextResponse.json(
        { error: "content must be a non-empty string under 50,000 characters" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI not configured" }, { status: 503 });
    }

    const prompts: Record<string, string> = {
      summarize: `Summarize the following document in 3-5 concise sentences:\n\n${content}`,
      improve: `Improve the writing quality and clarity of the following text. Return only the improved text:\n\n${content}`,
      keypoints: `Extract the 5 most important key points from this document as a bullet list:\n\n${content}`,
    };

    const prompt = prompts[action] ?? prompts.summarize;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return NextResponse.json(
        { error: `AI request failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ""}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content ?? "";

    return NextResponse.json({ result });
  } catch (err) {
    return handleError(err);
  }
}
