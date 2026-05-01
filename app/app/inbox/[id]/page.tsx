import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ThreadDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireTenant();
  const supabase = createAdminSupabaseClient();
  const [threadRes, messagesRes] = await Promise.all([
    supabase
      .from("email_threads")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle(),
    supabase
      .from("email_messages")
      .select("*")
      .eq("thread_id", id)
      .eq("tenant_id", ctx.tenantId)
      .order("verzonden_op", { ascending: true }),
  ]);

  const thread = threadRes.data;
  if (!thread) notFound();

  return (
    <div className="max-w-3xl space-y-4">
      <Link
        href="/app/inbox"
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Inbox
      </Link>
      <h1 className="text-2xl font-bold text-enervia-700">
        {thread.onderwerp ?? "(geen onderwerp)"}
      </h1>
      <div className="text-sm text-muted-foreground">
        {(thread.deelnemers ?? []).join(", ")}
      </div>
      <div className="space-y-3">
        {(messagesRes.data ?? []).map((m: any) => (
          <div key={m.id} className="bg-white rounded-lg border p-5">
            <div className="flex items-center justify-between text-sm mb-2">
              <div>
                <strong>{m.van}</strong>
                <span className="text-muted-foreground">
                  {" "}
                  → {(m.aan ?? []).join(", ")}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {m.verzonden_op &&
                  new Date(m.verzonden_op).toLocaleString("nl-BE")}
              </div>
            </div>
            {m.inhoud_html ? (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: m.inhoud_html }}
              />
            ) : (
              <pre className="whitespace-pre-wrap text-sm">
                {m.inhoud_tekst}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
