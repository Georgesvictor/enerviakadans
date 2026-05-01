"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";

export function NieuweTaakForm({
  projects,
  contacts,
  members,
  initialProjectId,
  initialContactId,
  currentUserId,
}: {
  projects: { id: string; naam: string }[];
  contacts: { id: string; voornaam: string; achternaam: string }[];
  members: { id: string; email: string }[];
  initialProjectId?: string;
  initialContactId?: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    titel: "",
    beschrijving: "",
    project_id: initialProjectId ?? "",
    contact_id: initialContactId ?? "",
    toegewezen_aan: currentUserId,
    prioriteit: "normaal",
    deadline: "",
  });
  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/taken", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          project_id: form.project_id || null,
          contact_id: form.contact_id || null,
          deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Opslaan mislukt");
      toast({ title: "Taak aangemaakt", variant: "success" });
      router.push("/app/taken");
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
    <form
      onSubmit={submit}
      className="space-y-4 bg-white rounded-lg border p-5"
    >
      <div>
        <Label>
          Titel <span className="text-red-600">*</span>
        </Label>
        <Input
          required
          value={form.titel}
          onChange={(e) => set("titel", e.target.value)}
        />
      </div>
      <div>
        <Label>Beschrijving</Label>
        <textarea
          className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[60px]"
          value={form.beschrijving}
          onChange={(e) => set("beschrijving", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Project</Label>
          <select
            className="w-full h-9 rounded-md border bg-background px-3 text-sm"
            value={form.project_id}
            onChange={(e) => set("project_id", e.target.value)}
          >
            <option value="">—</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.naam}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Contact</Label>
          <select
            className="w-full h-9 rounded-md border bg-background px-3 text-sm"
            value={form.contact_id}
            onChange={(e) => set("contact_id", e.target.value)}
          >
            <option value="">—</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.voornaam} {c.achternaam}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Toegewezen aan</Label>
          <select
            className="w-full h-9 rounded-md border bg-background px-3 text-sm"
            value={form.toegewezen_aan}
            onChange={(e) => set("toegewezen_aan", e.target.value)}
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.email}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Prioriteit</Label>
          <select
            className="w-full h-9 rounded-md border bg-background px-3 text-sm"
            value={form.prioriteit}
            onChange={(e) => set("prioriteit", e.target.value)}
          >
            <option value="laag">Laag</option>
            <option value="normaal">Normaal</option>
            <option value="hoog">Hoog</option>
            <option value="dringend">Dringend</option>
          </select>
        </div>
        <div>
          <Label>Deadline</Label>
          <Input
            type="datetime-local"
            value={form.deadline}
            onChange={(e) => set("deadline", e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Opslaan..." : "Taak aanmaken"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/app/taken")}
        >
          Annuleren
        </Button>
      </div>
    </form>
  );
}
