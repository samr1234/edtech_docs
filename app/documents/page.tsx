import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DocumentsClient } from "./DocumentsClient";

export default async function DocumentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return <DocumentsClient />;
}
