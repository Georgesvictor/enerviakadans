/**
 * Gmail API wrapper via Google OAuth 2.0.
 *
 * Scopes:
 *  - https://www.googleapis.com/auth/gmail.readonly
 *  - https://www.googleapis.com/auth/gmail.send
 *  - https://www.googleapis.com/auth/gmail.modify (labels)
 *
 * Token-opslag: email_accounts tabel per user.
 */

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  labelIds: string[];
  payload?: any;
  internalDate?: string;
}

export class GmailClient {
  constructor(
    private readonly accessToken: string,
    private readonly baseUrl = "https://gmail.googleapis.com/gmail/v1",
  ) {}

  private async fetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${this.accessToken}`,
      },
    });
    if (!res.ok)
      throw new Error(`Gmail ${path} ${res.status}: ${await res.text()}`);
    return res.json();
  }

  /** Lijst message-IDs; gebruik query voor filters (bv "is:unread"). */
  async listMessages(query: string, maxResults = 50): Promise<string[]> {
    const q = new URLSearchParams({ q: query, maxResults: String(maxResults) });
    const r = await this.fetch<{ messages?: { id: string }[] }>(
      `/users/me/messages?${q.toString()}`,
    );
    return (r.messages ?? []).map((m) => m.id);
  }

  /** Haal een message op met headers + body. */
  async getMessage(id: string): Promise<GmailMessage> {
    return this.fetch<GmailMessage>(`/users/me/messages/${id}?format=full`);
  }

  /** Verstuur een email via Gmail API. */
  async sendMessage(args: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
    cc?: string;
    bcc?: string;
  }): Promise<{ id: string; threadId: string }> {
    const mime = buildMime(args);
    const raw = Buffer.from(mime)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    return this.fetch<{ id: string; threadId: string }>(
      `/users/me/messages/send`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ raw }),
      },
    );
  }
}

function buildMime(m: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  cc?: string;
  bcc?: string;
}): string {
  const boundary = `kdns_${Date.now()}`;
  const lines: string[] = [];
  lines.push(`To: ${m.to}`);
  if (m.cc) lines.push(`Cc: ${m.cc}`);
  if (m.bcc) lines.push(`Bcc: ${m.bcc}`);
  lines.push(`Subject: ${m.subject}`);
  lines.push("MIME-Version: 1.0");

  if (m.html && m.text) {
    lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    lines.push("");
    lines.push(`--${boundary}`);
    lines.push("Content-Type: text/plain; charset=UTF-8");
    lines.push("");
    lines.push(m.text);
    lines.push(`--${boundary}`);
    lines.push("Content-Type: text/html; charset=UTF-8");
    lines.push("");
    lines.push(m.html);
    lines.push(`--${boundary}--`);
  } else if (m.html) {
    lines.push("Content-Type: text/html; charset=UTF-8");
    lines.push("");
    lines.push(m.html);
  } else {
    lines.push("Content-Type: text/plain; charset=UTF-8");
    lines.push("");
    lines.push(m.text ?? "");
  }
  return lines.join("\r\n");
}

export function parseGmailHeaders(
  headers: Array<{ name: string; value: string }>,
): Record<string, string> {
  const m: Record<string, string> = {};
  for (const h of headers ?? []) m[h.name.toLowerCase()] = h.value;
  return m;
}
