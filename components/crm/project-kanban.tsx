"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { toast } from "@/components/ui/toaster";

const KOLOMMEN = [
  { code: "to_do", label: "To do" },
  { code: "lopend", label: "Lopend" },
  { code: "on_hold", label: "On hold" },
  { code: "klaar", label: "Klaar" },
];

type Line = {
  id: string;
  omschrijving: string;
  is_kop: boolean;
  status: string;
  groep: string | null;
  aantal: number;
  eenheid: string;
};

export function ProjectKanban({
  projectId,
  lines: initial,
}: {
  projectId: string;
  lines: Line[];
}) {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>(initial.filter((l) => !l.is_kop));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  async function onDragEnd(e: DragEndEvent) {
    const lineId = String(e.active.id);
    const newStatus = e.over?.id ? String(e.over.id) : null;
    if (!newStatus) return;
    const huidig = lines.find((l) => l.id === lineId)?.status;
    if (huidig === newStatus) return;

    setLines((arr) =>
      arr.map((l) => (l.id === lineId ? { ...l, status: newStatus } : l)),
    );
    try {
      await fetch(`/api/projecten/${projectId}/lines`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ line_id: lineId, status: newStatus }),
      });
      router.refresh();
    } catch (err) {
      setLines((arr) =>
        arr.map((l) => (l.id === lineId ? { ...l, status: huidig ?? "to_do" } : l)),
      );
      toast({
        title: "Kon status niet wijzigen",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {KOLOMMEN.map((k) => {
          const items = lines.filter((l) => l.status === k.code);
          return (
            <KanbanColumn
              key={k.code}
              code={k.code}
              label={k.label}
              count={items.length}
            >
              {items.map((l) => (
                <KanbanCard key={l.id} line={l} />
              ))}
            </KanbanColumn>
          );
        })}
      </div>
    </DndContext>
  );
}

function KanbanColumn({
  code,
  label,
  count,
  children,
}: {
  code: string;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: code });
  return (
    <div
      ref={setNodeRef}
      className={`w-72 shrink-0 rounded-lg ${
        isOver ? "bg-enervia-50" : "bg-muted/30"
      }`}
    >
      <div className="p-3 border-b uppercase text-xs font-semibold text-muted-foreground">
        {label} ({count})
      </div>
      <div className="p-2 space-y-2 min-h-[200px]">{children}</div>
    </div>
  );
}

function KanbanCard({ line }: { line: Line }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: line.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-md border p-3 cursor-grab text-sm ${
        isDragging ? "opacity-40" : "hover:border-enervia-600"
      }`}
    >
      <div className="font-medium">{line.omschrijving}</div>
      {line.groep && (
        <div className="text-xs text-muted-foreground">{line.groep}</div>
      )}
      <div className="flex items-center justify-between text-xs mt-2 text-muted-foreground">
        <span>Geen einddatum</span>
        <span>
          {line.aantal} {line.eenheid}
        </span>
      </div>
    </div>
  );
}
