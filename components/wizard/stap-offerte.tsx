"use client";

import { useState, useRef } from "react";
import { Upload, FileText, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TeamleaderQuotationsLijst } from "./teamleader-lijst";

export function StapOfferte({
  loading,
  onUpload,
  onFromTeamleader,
}: {
  loading: boolean;
  onUpload: (f: File) => void;
  onFromTeamleader: (quotationId: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  function handleFile(f: File) {
    if (f.size > 20 * 1024 * 1024) {
      alert("Bestand is groter dan 20 MB");
      return;
    }
    setFile(f);
  }

  return (
    <div className="p-6">
      <Tabs defaultValue="upload">
        <TabsList>
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload PDF
          </TabsTrigger>
          <TabsTrigger value="teamleader">
            <LinkIcon className="h-4 w-4 mr-2" />
            Uit Teamleader
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upload">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition ${
              drag ? "border-enervia-500 bg-enervia-50" : "border-enervia-200"
            }`}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            {file ? (
              <div>
                <FileText className="h-10 w-10 mx-auto text-enervia-500 mb-2" />
                <div className="font-medium">{file.name}</div>
                <div className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            ) : (
              <div>
                <Upload className="h-10 w-10 mx-auto text-enervia-400 mb-2" />
                <div className="font-medium">Sleep een PDF hierheen of klik om te selecteren</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Enervia-offerte in PDF-formaat, max 20 MB
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-6">
            <Button
              size="lg"
              disabled={!file || loading}
              onClick={() => file && onUpload(file)}
            >
              {loading ? "Bezig..." : "Opladen en volgende →"}
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="teamleader">
          <TeamleaderQuotationsLijst onChoose={onFromTeamleader} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
