"use client";

import { Phone, Mail, MessageCircle, Calendar, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "@/components/ui/toaster";

export function ContactActions({
  email,
  telefoon,
  gsm,
  naam,
}: {
  email?: string | null;
  telefoon?: string | null;
  gsm?: string | null;
  naam?: string | null;
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  function copy(value: string, field: string) {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    toast({ title: "Gekopieerd", description: value, variant: "success" });
    setTimeout(() => setCopiedField(null), 1500);
  }

  function whatsappLink(num: string) {
    // Strip non-digits, voeg '+' toe als BE-nummer
    const clean = num.replace(/[^\d+]/g, "");
    let intl = clean;
    if (clean.startsWith("0")) intl = "+32" + clean.slice(1);
    else if (!clean.startsWith("+")) intl = "+" + clean;
    return `https://wa.me/${intl.replace(/\+/g, "")}`;
  }

  const numToCall = gsm || telefoon;

  if (!email && !telefoon && !gsm) {
    return (
      <div className="text-xs text-muted-foreground italic">
        Geen contactgegevens
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {email && (
        <div className="inline-flex items-center bg-white border rounded-md text-sm overflow-hidden hover:border-enervia-400 transition group">
          <a
            href={`mailto:${email}${naam ? `?body=Beste%20${encodeURIComponent(naam.split(" ")[0])}%2C%0A%0A` : ""}`}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-blue-50 group"
          >
            <Mail size={14} className="text-blue-600" />
            <span>{email}</span>
          </a>
          <button
            type="button"
            onClick={() => copy(email, "email")}
            className="px-2 py-1.5 border-l hover:bg-muted"
            title="Kopieer"
          >
            {copiedField === "email" ? (
              <Check size={12} className="text-emerald-600" />
            ) : (
              <Copy size={12} className="text-muted-foreground" />
            )}
          </button>
        </div>
      )}

      {numToCall && (
        <>
          <a
            href={`tel:${numToCall.replace(/\s/g, "")}`}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border rounded-md text-sm hover:bg-emerald-50 hover:border-emerald-400 transition"
          >
            <Phone size={14} className="text-emerald-600" />
            <span>{numToCall}</span>
          </a>
          <a
            href={whatsappLink(numToCall)}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border rounded-md text-sm hover:bg-green-50 hover:border-green-400 transition"
            title="Open in WhatsApp"
          >
            <MessageCircle size={14} className="text-green-600" />
            <span>WhatsApp</span>
          </a>
        </>
      )}

      {email && (
        <a
          href={`https://calendar.google.com/calendar/render?action=TEMPLATE&add=${encodeURIComponent(email)}&text=${encodeURIComponent(`Afspraak met ${naam ?? ""}`)}`}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border rounded-md text-sm hover:bg-amber-50 hover:border-amber-400 transition"
          title="Plan in Google Calendar"
        >
          <Calendar size={14} className="text-amber-600" />
          <span>Afspraak plannen</span>
        </a>
      )}
    </div>
  );
}
