import { FolderOpen } from "lucide-react";

export const dynamic = "force-dynamic";

export default function BestandenPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-enervia-700">Bestanden</h1>
        <p className="text-muted-foreground text-sm">
          Documenten, foto's en plannen gekoppeld aan klant, deal of project.
        </p>
      </div>
      <div className="text-center py-12 bg-white rounded-lg border">
        <FolderOpen size={32} className="mx-auto text-muted-foreground mb-2" />
        <div className="text-muted-foreground">
          Bestanden zijn beschikbaar via het tabblad van elk contact, deal of project.
        </div>
      </div>
    </div>
  );
}
