"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Mail, Phone, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type ContactRow = {
  id: string;
  voornaam: string;
  achternaam: string;
  email: string | null;
  telefoon: string | null;
  gsm: string | null;
  functie: string | null;
  company_id: string | null;
  tags_cache: string[] | null;
  is_klant: boolean;
  companies?: { naam: string } | null;
};

export function ContactenLijst({
  initial,
  initialQuery,
}: {
  initial: ContactRow[];
  initialQuery: string;
}) {
  const [rows] = useState<ContactRow[]>(initial);
  const [q, setQ] = useState(initialQuery);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, start] = useTransition();

  function zoek(val: string) {
    setQ(val);
    start(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (val) params.set("q", val);
      else params.delete("q");
      router.replace(`/app/contacten?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-md">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Zoek op naam, e-mail, telefoon..."
          value={q}
          onChange={(e) => zoek(e.target.value)}
          className="pl-9"
        />
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <div className="text-muted-foreground">Geen contacten gevonden.</div>
          <Link
            href="/app/contacten/nieuw"
            className="inline-block mt-3 text-enervia-600 hover:underline"
          >
            + Eerste contact toevoegen
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Naam</th>
                <th className="text-left px-4 py-3">Bedrijf</th>
                <th className="text-left px-4 py-3">Contact</th>
                <th className="text-left px-4 py-3">Tags</th>
                <th className="text-left px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <Link
                      href={`/app/contacten/${r.id}`}
                      className="font-medium text-enervia-700 hover:underline"
                    >
                      {r.voornaam} {r.achternaam}
                    </Link>
                    {r.functie && (
                      <div className="text-xs text-muted-foreground">
                        {r.functie}
                      </div>
                    )}
                    {r.is_klant && (
                      <Badge className="mt-1 bg-enervia-50 text-enervia-700 border border-enervia-600/30">
                        Klant
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.companies?.naam && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Building2 size={14} />
                        {r.companies.naam}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      {r.email && (
                        <div className="flex items-center gap-1 text-xs">
                          <Mail size={12} className="text-muted-foreground" />
                          <a
                            href={`mailto:${r.email}`}
                            className="hover:underline"
                          >
                            {r.email}
                          </a>
                        </div>
                      )}
                      {(r.telefoon || r.gsm) && (
                        <div className="flex items-center gap-1 text-xs">
                          <Phone size={12} className="text-muted-foreground" />
                          <a
                            href={`tel:${r.telefoon ?? r.gsm}`}
                            className="hover:underline"
                          >
                            {r.telefoon ?? r.gsm}
                          </a>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(r.tags_cache ?? []).map((t) => (
                        <Badge key={t} variant="outline" className="text-xs">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/app/contacten/${r.id}`}
                      className="text-enervia-600 hover:underline text-xs"
                    >
                      Openen →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        {rows.length} contact{rows.length === 1 ? "" : "en"} getoond
      </div>
    </div>
  );
}
