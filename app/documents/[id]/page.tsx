import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Editor } from "@/components/editor/Editor";
import { OfflineEditor } from "@/components/editor/OfflineEditor";

interface Props {
  params: Promise<{ id: string }>;
}

type DocResult =
  | { status: "ok"; doc: { id: string; title: string; role: string } }
  | { status: "not_found" }
  | { status: "offline" };

async function getDocument(id: string, cookieHeader: string): Promise<DocResult> {
  try {
    const res = await fetch(
      `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/documents/${id}`,
      {
        headers: { Cookie: cookieHeader },
        cache: "no-store",
      }
    );
    if (res.status === 404) return { status: "not_found" };
    if (!res.ok) return { status: "offline" };
    const doc = await res.json();
    return { status: "ok", doc };
  } catch {
    return { status: "offline" };
  }
}

export default async function DocumentPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const result = await getDocument(id, cookieHeader);

  if (result.status === "not_found") notFound();

  if (result.status === "offline") {
    return (
      <OfflineEditor
        docId={id}
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? null}
      />
    );
  }

  const { doc } = result;

  return (
    <Editor
      docId={doc.id}
      userRole={doc.role}
      initialTitle={doc.title}
      userName={session.user.name ?? null}
      userEmail={session.user.email ?? null}
    />
  );
}
