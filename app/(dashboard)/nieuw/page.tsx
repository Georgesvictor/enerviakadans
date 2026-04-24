"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WizardStepper } from "@/components/wizard/wizard-stepper";
import { StapOfferte } from "@/components/wizard/stap-offerte";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toaster";

/**
 * Wizard stap 1: offerte kiezen of uploaden.
 * Vervolgstappen gebeuren op /dashboard/dossiers/[id] met ?stap=2, etc.
 */
export default function NieuwDossierPage() {
  const router = useRouter();
  const [isLoading, setLoading] = useState(false);

  async function handleUpload(file: File) {
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/dossiers", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }
      const { dossier_id } = await res.json();
      toast({ title: "Dossier aangemaakt", variant: "success" });
      router.push(`/dashboard/dossiers/${dossier_id}?stap=extractie`);
    } catch (err) {
      toast({
        title: "Upload mislukt",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleFromTeamleader(quotationId: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/dossiers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ teamleader_quotation_id: quotationId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { dossier_id } = await res.json();
      router.push(`/dashboard/dossiers/${dossier_id}?stap=extractie`);
    } catch (err) {
      toast({
        title: "Teamleader import mislukt",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold text-enervia-600">Nieuw dossier</h2>
        <p className="text-muted-foreground">
          Zes stappen naar een compleet dossier met premies, lening en besparing.
        </p>
      </div>
      <WizardStepper current={0} />
      <Card>
        <StapOfferte
          loading={isLoading}
          onUpload={handleUpload}
          onFromTeamleader={handleFromTeamleader}
        />
      </Card>
    </div>
  );
}
