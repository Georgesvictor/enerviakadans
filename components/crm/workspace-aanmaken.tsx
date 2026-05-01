"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";

export function WorkspaceAanmaken() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [naam, setNaam] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!naam.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/tenants/maken", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ naam: naam.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Aanmaken mislukt");
      toast({ title: "Workspace aangemaakt", variant: "success" });
      router.push("/app");
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
    <form onSubmit={submit} className="flex gap-2">
      <div className="flex-1">
        <Label className="sr-only">Workspace-naam</Label>
        <Input
          value={naam}
          onChange={(e) => setNaam(e.target.value)}
          placeholder="Bv. Enervia BV"
          required
        />
      </div>
      <Button type="submit" disabled={busy || !naam.trim()}>
        {busy ? "Aanmaken..." : "Workspace maken"}
      </Button>
    </form>
  );
}
