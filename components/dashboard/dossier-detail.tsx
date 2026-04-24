"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { WizardStepper } from "@/components/wizard/wizard-stepper";
import { StapExtractieReview } from "@/components/wizard/stap-extractie-review";
import { StapKlantParameters } from "@/components/wizard/stap-klant-parameters";
import { StapPremies } from "@/components/wizard/stap-premies";
import { StapLening } from "@/components/wizard/stap-lening";
import { StapBesparing } from "@/components/wizard/stap-besparing";
import { DossierSamenvatting } from "./dossier-samenvatting";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/format";
import { toast } from "@/components/ui/toaster";
import { Download, Link as LinkIcon, Copy } from "lucide-react";

const STAP_INDEX: Record<string, number> = {
  extractie: 1,
  klant: 2,
  premies: 3,
  lening: 4,
  besparing: 5,
};

export function DossierDetail({
  dossier,
  initialStap,
}: {
  dossier: any;
  initialStap: string;
}) {
  const [stap, setStap] = useState(initialStap);
  const [samenvattingMode, setMode] = useState<"bank" | "klant">("bank");

  async function genereerPDF(type: "bank" | "klant") {
    const res = await fetch(`/api/dossiers/${dossier.id}/pdf`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type }),
    });
    if (!res.ok) {
      toast({ title: "PDF genereren mislukt", variant: "destructive" });
      return;
    }
    const { pdf_url } = await res.json();
    window.open(pdf_url, "_blank");
    toast({ title: "PDF gegenereerd", variant: "success" });
  }

  async function genereerKlantlink() {
    const res = await fetch(`/api/dossiers/${dossier.id}/klantlink`, {
      method: "POST",
    });
    if (!res.ok) {
      toast({ title: "Klantlink genereren mislukt", variant: "destructive" });
      return;
    }
    const { url } = await res.json();
    await navigator.clipboard.writeText(url);
    toast({
      title: "Klantlink gekopieerd",
      description: url,
      variant: "success",
    });
  }

  const alleStappen = dossier.parameters?.[0] && dossier.premie?.[0];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-enervia-600">
              {dossier.offerte_referentie ?? "Dossier"}
            </h2>
            <Badge variant={dossier.status === "compleet" ? "success" : "secondary"}>
              {dossier.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {dossier.klant?.voornaam} {dossier.klant?.achternaam} ·{" "}
            Verwijderd op {formatDate(dossier.auto_verwijder_op)}
          </p>
        </div>
        {alleStappen && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => genereerPDF(samenvattingMode)}>
              <Download className="h-4 w-4" />
              PDF ({samenvattingMode === "bank" ? "Bank" : "Klant"})
            </Button>
            <Button onClick={genereerKlantlink}>
              <LinkIcon className="h-4 w-4" />
              Klantlink
            </Button>
          </div>
        )}
      </div>

      <WizardStepper current={STAP_INDEX[stap] ?? 1} />

      <Tabs value={stap} onValueChange={setStap}>
        <TabsList>
          <TabsTrigger value="extractie">Extractie</TabsTrigger>
          <TabsTrigger value="klant">Klant</TabsTrigger>
          <TabsTrigger value="premies">Premies</TabsTrigger>
          <TabsTrigger value="lening">Lening</TabsTrigger>
          <TabsTrigger value="besparing">Besparing</TabsTrigger>
          {alleStappen && <TabsTrigger value="samenvatting">Dossier</TabsTrigger>}
        </TabsList>

        <TabsContent value="extractie">
          <StapExtractieReview dossier={dossier} onNext={() => setStap("klant")} />
        </TabsContent>
        <TabsContent value="klant">
          <StapKlantParameters dossier={dossier} onNext={() => setStap("premies")} />
        </TabsContent>
        <TabsContent value="premies">
          <StapPremies dossier={dossier} onNext={() => setStap("lening")} />
        </TabsContent>
        <TabsContent value="lening">
          <StapLening dossier={dossier} onNext={() => setStap("besparing")} />
        </TabsContent>
        <TabsContent value="besparing">
          <StapBesparing dossier={dossier} onNext={() => setStap("samenvatting")} />
        </TabsContent>
        {alleStappen && (
          <TabsContent value="samenvatting">
            <DossierSamenvatting
              dossier={dossier}
              mode={samenvattingMode}
              onModeChange={setMode}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
