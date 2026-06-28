import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Editor } from "@/components/editor/Editor";

interface Props {
  params: Promise<{ id: string }>;
}

async function getDocument(id: string, cookieHeader: string) {
  const res = await fetch(
    `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/documents/${id}`,
    {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    }
  );
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json();
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

  const doc = await getDocument(id, cookieHeader);
  if (!doc) notFound();

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
