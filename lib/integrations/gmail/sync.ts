/**
 * Gmail sync — fetch recente mails en sla op in email_threads + email_messages.
 * Kopelt automatisch aan contacten via `from` / `to` matching.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  GmailClient,
  parseGmailHeaders,
} from "@/lib/integrations/gmail/client";
import { refreshGoogleToken } from "@/lib/integrations/gmail/oauth";

async function getFreshToken(
  accountId: string,
): Promise<string> {
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("email_accounts")
    .select("access_token, refresh_token, token_expires_at")
    .eq("id", accountId)
    .single();
  if (!data) throw new Error("account niet gevonden");
  if (
    data.token_expires_at &&
    new Date(data.token_expires_at).getTime() - Date.now() > 60_000
  ) {
    return data.access_token;
  }
  if (!data.refresh_token) return data.access_token;
  const refreshed = await refreshGoogleToken(data.refresh_token);
  const expires = new Date(
    Date.now() + (refreshed.expires_in ?? 3600) * 1000,
  ).toISOString();
  await supabase
    .from("email_accounts")
    .update({
      access_token: refreshed.access_token,
      token_expires_at: expires,
    })
    .eq("id", accountId);
  return refreshed.access_token;
}

function extractEmailAddress(header: string | undefined): string {
  if (!header) return "";
  const m = header.match(/<([^>]+)>/);
  return (m ? m[1] : header).trim().toLowerCase();
}

export async function syncGmailAccount(accountId: string, max = 50) {
  const supabase = createAdminSupabaseClient();
  const { data: account } = await supabase
    .from("email_accounts")
    .select("*")
    .eq("id", accountId)
    .maybeSingle();
  if (!account) throw new Error("account niet gevonden");

  const token = await getFreshToken(accountId);
  const client = new GmailClient(token);

  // Haal recente message-ids
  const ids = await client.listMessages("newer_than:7d", max);
  let nieuw = 0;
  for (const id of ids) {
    // Skip indien al gekend
    const { data: bestaand } = await supabase
      .from("email_messages")
      .select("id")
      .eq("externe_message_id", id)
      .maybeSingle();
    if (bestaand) continue;

    const msg = await client.getMessage(id);
    const headers = parseGmailHeaders(msg.payload?.headers ?? []);
    const van = extractEmailAddress(headers.from);
    const aan = (headers.to ?? "")
      .split(",")
      .map((s) => extractEmailAddress(s))
      .filter(Boolean);
    const onderwerp = headers.subject ?? "(geen onderwerp)";
    const inhoud = extractBody(msg.payload);
    const verzonden = msg.internalDate
      ? new Date(Number(msg.internalDate)).toISOString()
      : new Date().toISOString();

    // Upsert thread
    const deelnemers = Array.from(new Set([van, ...aan])).filter(Boolean);
    const { data: thread } = await supabase
      .from("email_threads")
      .upsert(
        {
          tenant_id: account.tenant_id,
          account_id: account.id,
          externe_thread_id: msg.threadId,
          onderwerp,
          deelnemers,
          laatst_bericht_op: verzonden,
        },
        { onConflict: "account_id,externe_thread_id" } as any,
      )
      .select("id")
      .single();

    if (!thread) continue;

    await supabase.from("email_messages").insert({
      tenant_id: account.tenant_id,
      thread_id: thread.id,
      externe_message_id: id,
      van,
      aan,
      onderwerp,
      inhoud_tekst: inhoud.text,
      inhoud_html: inhoud.html,
      verzonden_op: verzonden,
      is_uitgaand: van === account.email,
    });

    // Verhoog thread-counter (best effort, negeer fouten)
    try {
      await (supabase as any).rpc("increment_thread_count", {
        thread_id: thread.id,
      });
    } catch {
      // RPC niet beschikbaar — niet kritiek
    }

    // Auto-link aan contact op basis van email-match
    const externeEmail = van === account.email ? aan[0] : van;
    if (externeEmail) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("id")
        .eq("tenant_id", account.tenant_id)
        .eq("email", externeEmail)
        .maybeSingle();
      if (contact) {
        await supabase.from("email_links").upsert(
          {
            tenant_id: account.tenant_id,
            thread_id: thread.id,
            entity_type: "contact",
            entity_id: contact.id,
          },
          { onConflict: "thread_id,entity_type,entity_id" } as any,
        );
      }
    }

    nieuw++;
  }

  await supabase
    .from("email_accounts")
    .update({ laatst_gesynct: new Date().toISOString() })
    .eq("id", accountId);

  return { nieuw, opgehaald: ids.length };
}

function extractBody(payload: any): { text: string; html: string } {
  if (!payload) return { text: "", html: "" };
  let text = "";
  let html = "";

  function walk(part: any) {
    if (!part) return;
    if (part.mimeType === "text/plain" && part.body?.data) {
      text = Buffer.from(part.body.data, "base64url").toString("utf-8");
    } else if (part.mimeType === "text/html" && part.body?.data) {
      html = Buffer.from(part.body.data, "base64url").toString("utf-8");
    } else if (Array.isArray(part.parts)) {
      for (const p of part.parts) walk(p);
    }
  }
  walk(payload);
  if (!text && payload.body?.data) {
    text = Buffer.from(payload.body.data, "base64url").toString("utf-8");
  }
  return { text, html };
}
