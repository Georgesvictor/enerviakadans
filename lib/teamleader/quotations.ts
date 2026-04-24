/**
 * Teamleader Focus API v2 — quotations.
 */

import { getValidAccessToken } from "./oauth";

const TL_API_BASE = "https://api.focus.teamleader.eu";

export interface TLQuotation {
  id: string;
  number: string;
  status: string;
  date: string;
  total: { amount: number; currency: string };
  deal?: { id: string; type: string };
  contact?: { id: string; type: string };
}

async function tlFetch(userId: string, path: string, body?: object) {
  const token = await getValidAccessToken(userId);
  if (!token) throw new Error("Geen geldige Teamleader token voor gebruiker");
  const res = await fetch(`${TL_API_BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(
      `Teamleader API ${path} faalde: ${res.status} ${await res.text()}`,
    );
  }
  return res.json();
}

export async function listQuotations(userId: string, limit = 50): Promise<TLQuotation[]> {
  const json = await tlFetch(userId, "/quotations.list", {
    page: { size: limit },
    sort: [{ field: "created_at", order: "desc" }],
  });
  return json.data as TLQuotation[];
}

export async function getQuotation(
  userId: string,
  quotationId: string,
): Promise<unknown> {
  return tlFetch(userId, `/quotations.info`, { id: quotationId });
}

export async function downloadQuotationPdf(
  userId: string,
  quotationId: string,
): Promise<ArrayBuffer> {
  const token = await getValidAccessToken(userId);
  if (!token) throw new Error("Geen geldige Teamleader token");

  const res = await fetch(`${TL_API_BASE}/quotations.download`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: quotationId, format: "pdf" }),
  });

  if (!res.ok) {
    throw new Error(`PDF download faalde: ${res.status}`);
  }
  const data = (await res.json()) as { data: { location: string } };
  const pdfRes = await fetch(data.data.location);
  return pdfRes.arrayBuffer();
}

export async function getContact(
  userId: string,
  contactId: string,
): Promise<{
  first_name?: string;
  last_name?: string;
  emails?: Array<{ type: string; email: string }>;
  telephones?: Array<{ type: string; number: string }>;
  addresses?: Array<{
    type: string;
    address: {
      line_1: string;
      postal_code: string;
      city: string;
      country: string;
    };
  }>;
}> {
  const json = await tlFetch(userId, "/contacts.info", { id: contactId });
  return json.data;
}
