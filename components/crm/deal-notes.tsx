"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { MessageSquare, Cog } from "lucide-react";

type Note = {
  id: string;
  inhoud: string;
  is_systeem: boolean;
  created_at: string;
  users?: { email: string } | null;
};

export function DealNotes({
  dealId,
  initial,
}: {
  dealId: string;
  initial: Note[];
}) {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>(initial);
  const [tekst, setTekst] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!tekst.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/notes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inhoud: tekst.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Mislukt");
      const note = await res.json();
      setNotes((n) => [note, ...n]);
      setTekst("");
      router.refresh();
    } catch (err) {
      toast({
        title: "Fout",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="space-y-2">
        <textarea
          className="w-full rounded border bg-background px-3 py-2 text-sm min-h-[60px]"
          placeholder="Voeg een opmerking toe..."
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={busy || !tekst.trim()} size="sm">
            {busy ? "Opslaan..." : "Plaats opmerking"}
          </Button>
        </div>
      </form>

      {notes.length === 0 ? (
        <div className="text-center py-4 text-sm text-muted-foreground">
          Nog geen opmerkingen.
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {notes.map((n) => (
            <div
              key={n.id}
              className={`p-3 rounded text-sm ${
                n.is_systeem
                  ? "bg-muted/30 border-l-2 border-muted text-muted-foreground"
                  : "bg-blue-50/30 border border-blue-100"
              }`}
            >
              <div className="flex items-center justify-between mb-1 text-xs">
                <span className="flex items-center gap-1">
                  {n.is_systeem ? (
                    <Cog size={12} />
                  ) : (
                    <MessageSquare size={12} />
                  )}
                  <strong>
                    {n.is_systeem ? "Systeem" : n.users?.email ?? "Gebruiker"}
                  </strong>
                </span>
                <span className="text-muted-foreground">
                  {new Date(n.created_at).toLocaleString("nl-BE")}
                </span>
              </div>
              <div className="whitespace-pre-wrap">{n.inhoud}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
