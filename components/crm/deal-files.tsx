"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { Upload, FileText, ImageIcon, Trash2, Download } from "lucide-react";

type Bestand = {
  id: string;
  naam: string;
  mime: string | null;
  grootte: number | null;
  gemaakt_op: string;
  geupload_door: string | null;
};

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

export function DealFiles({
  dealId,
  initial,
}: {
  dealId: string;
  initial: Bestand[];
}) {
  const router = useRouter();
  const [files, setFiles] = useState<Bestand[]>(initial);
  const [busy, setBusy] = useState(false);

  async function upload(input: FileList | null) {
    if (!input || input.length === 0) return;
    const items = Array.from(input);
    for (const f of items) {
      if (f.size > MAX_SIZE) {
        toast({
          title: `${f.name} is te groot`,
          description: `Max 25 MB. Grootte: ${(f.size / 1024 / 1024).toFixed(1)} MB`,
          variant: "destructive",
        });
        continue;
      }
      setBusy(true);
      try {
        const fd = new FormData();
        fd.append("file", f);
        fd.append("entity_type", "deal");
        fd.append("entity_id", dealId);
        const res = await fetch("/api/files/upload", {
          method: "POST",
          body: fd,
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Upload mislukt");
        const data = await res.json();
        setFiles((arr) => [data, ...arr]);
        toast({ title: `${f.name} geüpload`, variant: "success" });
      } catch (err) {
        toast({
          title: "Upload mislukt",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        });
      } finally {
        setBusy(false);
      }
    }
    router.refresh();
  }

  async function download(id: string, naam: string) {
    try {
      const res = await fetch(`/api/files/${id}/url`);
      if (!res.ok) throw new Error("Kan link niet ophalen");
      const data = await res.json();
      window.open(data.url, "_blank");
    } catch (err) {
      toast({
        title: "Download mislukt",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  }

  async function verwijder(id: string) {
    if (!confirm("Bestand verwijderen?")) return;
    try {
      const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Mislukt");
      setFiles((arr) => arr.filter((f) => f.id !== id));
      toast({ title: "Bestand verwijderd", variant: "success" });
    } catch (err) {
      toast({
        title: "Fout",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  }

  function icon(mime: string | null) {
    if (!mime) return <FileText size={16} />;
    if (mime.startsWith("image/")) return <ImageIcon size={16} />;
    return <FileText size={16} />;
  }

  function grootte(b: number | null) {
    if (!b) return "—";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <input
          type="file"
          multiple
          className="hidden"
          onChange={(e) => upload(e.target.files)}
        />
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
            busy
              ? "bg-muted/50 border-muted-foreground"
              : "border-enervia-300 hover:bg-enervia-50/50 hover:border-enervia-600"
          }`}
        >
          <Upload size={28} className="mx-auto text-enervia-600 mb-2" />
          <div className="font-medium text-enervia-700">
            {busy ? "Bezig met uploaden..." : "Sleep bestanden hier of klik om te kiezen"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            PDF, foto's, plannen. Max 25 MB per bestand.
          </div>
        </div>
      </label>

      {files.length === 0 ? (
        <div className="text-center py-4 text-sm text-muted-foreground">
          Geen bestanden gekoppeld aan deze deal.
        </div>
      ) : (
        <div className="divide-y border rounded">
          {files.map((f) => (
            <div
              key={f.id}
              className="p-3 flex items-center gap-3 hover:bg-muted/30"
            >
              <div className="text-enervia-600">{icon(f.mime)}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{f.naam}</div>
                <div className="text-xs text-muted-foreground">
                  {grootte(f.grootte)} · {new Date(f.gemaakt_op).toLocaleDateString("nl-BE")}
                </div>
              </div>
              <button
                onClick={() => download(f.id, f.naam)}
                className="text-enervia-600 hover:bg-enervia-50 rounded p-1.5"
                title="Download"
              >
                <Download size={14} />
              </button>
              <button
                onClick={() => verwijder(f.id)}
                className="text-red-600 hover:bg-red-50 rounded p-1.5"
                title="Verwijderen"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
