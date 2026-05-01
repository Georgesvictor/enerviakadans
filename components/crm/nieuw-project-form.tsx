"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";

export function NieuwProjectForm({
  contacts,
  companies,
  initialNaam,
  initialContactId,
  initialCompanyId,
  initialDealId,
}: {
  contacts: { id: string; voornaam: string; achternaam: string }[];
  companies: { id: string; naam: string }[];
  initialNaam?: string;
  initialContactId?: string;
  initialCompanyId?: string;
  initialDealId?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    naam: initialNaam ?? "",
    code: "",
    beschrijving: "",
    contact_id: initialContactId ?? "",
    company_id: initialCompanyId ?? "",
    deal_id: initialDealId ?? "",
    start_datum: "",
    deadline: "",
    budget_excl_btw: "",
    tarief_per_uur: "",
  });
  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/projecten", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          contact_id: form.contact_id || null,
          company_id: form.company_id || null,
          deal_id: form.deal_id || null,
          budget_excl_btw: form.budget_excl_btw
            ? Number(form.budget_excl_btw)
            : null,
          tarief_per_uur: form.tarief_per_uur
            ? Number(form.tarief_per_uur)
            : null,
          start_datum: form.start_datum || null,
          deadline: form.deadline || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Opslaan mislukt");
      const data = await res.json();
      toast({ title: "Project aangemaakt", variant: "success" });
      router.push(`/app/projecten/${data.id}`);
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
          Projectnaam <span className="text-red-600">*</span>
        </Label>
        <Input
          required
          value={form.naam}
          onChange={(e) => set("naam", e.target.value)}
        />
      </div>
      <div>
        <Label>Projectcode</Label>
        <Input
          value={form.code}
          onChange={(e) => set("code", e.target.value)}
          placeholder="bv. PRJ-2026-0042"
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
          <Label>Bedrijf</Label>
          <select
            className="w-full h-9 rounded-md border bg-background px-3 text-sm"
            value={form.company_id}
            onChange={(e) => set("company_id", e.target.value)}
          >
            <option value="">—</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.naam}
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
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Startdatum</Label>
          <Input
            type="date"
            value={form.start_datum}
            onChange={(e) => set("start_datum", e.target.value)}
          />
        </div>
        <div>
          <Label>Deadline</Label>
          <Input
            type="date"
            value={form.deadline}
            onChange={(e) => set("deadline", e.target.value)}
          />
        </div>
        <div>
          <Label>Budget (excl. btw)</Label>
          <Input
            type="number"
            step="0.01"
            value={form.budget_excl_btw}
            onChange={(e) => set("budget_excl_btw", e.target.value)}
          />
        </div>
        <div>
          <Label>Tarief per uur</Label>
          <Input
            type="number"
            step="0.01"
            value={form.tarief_per_uur}
            onChange={(e) => set("tarief_per_uur", e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Opslaan..." : "Project aanmaken"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/app/projecten")}
        >
          Annuleren
        </Button>
      </div>
    </form>
  );
}
