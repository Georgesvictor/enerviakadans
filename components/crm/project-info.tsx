export function ProjectInfo({ project }: { project: any }) {
  return (
    <div className="bg-white rounded-lg border p-5 space-y-3 text-sm">
      <h2 className="font-semibold text-enervia-700">Project-informatie</h2>
      {project.beschrijving ? (
        <div className="whitespace-pre-wrap text-muted-foreground">
          {project.beschrijving}
        </div>
      ) : (
        <div className="text-muted-foreground italic">
          Geen beschrijving toegevoegd.
        </div>
      )}
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t">
        {[
          ["Code", project.code],
          ["Status", project.status],
          ["Tarief per uur", project.tarief_per_uur ? `€ ${project.tarief_per_uur}` : "—"],
          ["Budget", project.budget_excl_btw ? `€ ${Number(project.budget_excl_btw).toLocaleString("nl-BE")}` : "—"],
          ["Aangemaakt", new Date(project.created_at).toLocaleDateString("nl-BE")],
        ].map(([k, v]) => (
          <div key={k as string} className="flex justify-between border-b py-1">
            <dt className="text-muted-foreground">{k}</dt>
            <dd>{v ?? "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
