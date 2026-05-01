"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Building2, User, Euro } from "lucide-react";
import { toast } from "@/components/ui/toaster";

interface Stage {
  id: string;
  naam: string;
  kleur: string;
  volgorde: number;
  is_won: boolean;
  is_lost: boolean;
  waarschijnlijkheid: number;
}

interface Deal {
  id: string;
  titel: string;
  waarde_excl_btw: number;
  stage_id: string;
  status: string;
  eigenaar_id: string | null;
  verwacht_afgesloten: string | null;
  contacts?: { voornaam: string; achternaam: string } | null;
  companies?: { naam: string } | null;
}

export function DealsKanban({
  stages,
  deals: initial,
}: {
  stages: Stage[];
  deals: Deal[];
}) {
  const [deals, setDeals] = useState<Deal[]>(initial);
  const [dragging, setDragging] = useState<Deal | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function onDragStart(e: DragStartEvent) {
    const d = deals.find((x) => x.id === e.active.id);
    setDragging(d ?? null);
  }

  async function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    const dealId = String(e.active.id);
    const newStageId = e.over?.id ? String(e.over.id) : null;
    if (!newStageId) return;
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage_id === newStageId) return;

    // Optimistic update
    setDeals((ds) => ds.map((d) => (d.id === dealId ? { ...d, stage_id: newStageId } : d)));

    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stage_id: newStageId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Update mislukt");
    } catch (err) {
      // Rollback
      setDeals((ds) => ds.map((d) => (d.id === dealId ? { ...d, stage_id: deal.stage_id } : d)));
      toast({
        title: "Kon deal niet verplaatsen",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  }

  const f = (n: number) =>
    `€ ${n.toLocaleString("nl-BE", { maximumFractionDigits: 0 })}`;

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage_id === stage.id);
          const totaal = stageDeals.reduce(
            (s, d) => s + Number(d.waarde_excl_btw ?? 0),
            0,
          );
          return (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              deals={stageDeals}
              totaal={totaal}
            />
          );
        })}
      </div>

      <DragOverlay>
        {dragging && (
          <div className="bg-white rounded-md border shadow-lg p-3 w-64 opacity-90">
            <div className="font-medium text-sm">{dragging.titel}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {f(Number(dragging.waarde_excl_btw))}
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  stage,
  deals,
  totaal,
}: {
  stage: Stage;
  deals: Deal[];
  totaal: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <div
      ref={setNodeRef}
      className={`w-72 shrink-0 rounded-lg transition ${
        isOver ? "bg-enervia-50" : "bg-muted/30"
      }`}
    >
      <div
        className="p-3 border-b"
        style={{ borderTopColor: stage.kleur, borderTopWidth: 3 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm text-enervia-700">
              {stage.naam}
            </div>
            <div className="text-xs text-muted-foreground">
              {deals.length} ·{" "}
              {`€ ${totaal.toLocaleString("nl-BE", { maximumFractionDigits: 0 })}`}
            </div>
          </div>
          {stage.is_won && (
            <span className="text-xs text-green-600">✓</span>
          )}
          {stage.is_lost && (
            <span className="text-xs text-red-600">✗</span>
          )}
        </div>
      </div>
      <div className="p-2 space-y-2 min-h-[200px]">
        {deals.map((d) => (
          <DealCard key={d.id} deal={d} />
        ))}
      </div>
    </div>
  );
}

function DealCard({ deal }: { deal: Deal }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: deal.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-md border p-3 cursor-grab active:cursor-grabbing hover:border-enervia-600 transition ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <Link
        href={`/app/deals/${deal.id}`}
        onClick={(e) => e.stopPropagation()}
        className="font-medium text-sm text-enervia-700 hover:underline line-clamp-2"
      >
        {deal.titel}
      </Link>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
        <Euro size={10} />
        {Number(deal.waarde_excl_btw).toLocaleString("nl-BE", {
          maximumFractionDigits: 0,
        })}
      </div>
      {deal.contacts && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <User size={10} />
          {deal.contacts.voornaam} {deal.contacts.achternaam}
        </div>
      )}
      {deal.companies && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <Building2 size={10} />
          {deal.companies.naam}
        </div>
      )}
    </div>
  );
}
