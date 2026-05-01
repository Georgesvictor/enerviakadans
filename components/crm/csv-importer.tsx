"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { Upload, FileText, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

export function CSVImporter() {
  const router = useRouter();
  const [type, setType] = useState<"contacten" | "bedrijven">("contacten");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast({ title: "Kies eerst een bestand", variant: "destructive" });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      const res = await fetch("/api/import/csv", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import mislukt");
      setResult(data);
      toast({
        title: `${data.imported} geïmporteerd`,
        description:
          data.errors > 0 ? `${data.errors} fouten` : "Alles geslaagd",
        variant: data.errors > 0 ? "default" : "success",
      });
      if (fileRef.current) fileRef.current.value = "";
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
    <div className="bg-white rounded-lg border p-6 space-y-4">
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setType("contacten")}
          className={`px-3 py-1.5 text-sm rounded-md ${
            type === "contacten"
              ? "bg-enervia-600 text-white"
              : "bg-muted hover:bg-muted/70"
          }`}
        >
          👤 Contacten
        </button>
        <button
          onClick={() => setType("bedrijven")}
          className={`px-3 py-1.5 text-sm rounded-md ${
            type === "bedrijven"
              ? "bg-enervia-600 text-white"
              : "bg-muted hover:bg-muted/70"
          }`}
        >
          🏢 Bedrijven
        </button>
      </div>

      <label className="block">
        <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-enervia-400 cursor-pointer transition">
          <Upload size={32} className="mx-auto text-muted-foreground" />
          <p className="text-sm mt-2">
            Klik of sleep een CSV-bestand hierheen
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            UTF-8, met komma- of puntkomma-separator
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            disabled={busy}
          />
        </div>
      </label>

      <Button onClick={upload} disabled={busy} className="w-full">
        {busy ? (
          <>
            <Loader2 size={14} className="animate-spin" /> Importeren...
          </>
        ) : (
          <>
            <FileText size={14} /> Start import
          </>
        )}
      </Button>

      {result && (
        <div
          className={`rounded-lg border p-4 ${
            result.errors > 0 ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            {result.errors > 0 ? (
              <AlertTriangle size={16} className="text-amber-600" />
            ) : (
              <CheckCircle2 size={16} className="text-emerald-600" />
            )}
            <span>Resultaat</span>
          </div>
          <ul className="text-sm mt-2 space-y-0.5">
            <li>
              ✅ <strong>{result.imported}</strong> geïmporteerd
            </li>
            <li>
              ⚠️ <strong>{result.errors}</strong> fouten
            </li>
            <li>
              📊 <strong>{result.totaal}</strong> rijen totaal
            </li>
          </ul>
          {result.errorSamples?.length > 0 && (
            <details className="text-xs mt-2 text-amber-800">
              <summary className="cursor-pointer">Voorbeelden van fouten</summary>
              <ul className="mt-1 ml-4 list-disc space-y-0.5">
                {result.errorSamples.map((e: string, i: number) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
