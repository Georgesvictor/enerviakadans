"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";

type Member = {
  user_id: string;
  rol_code: string;
  is_owner: boolean;
  toegevoegd_op: string;
  email: string | null;
};

const ROL_LABELS: Record<string, string> = {
  owner: "Eigenaar",
  admin: "Admin",
  manager: "Manager",
  user: "Gebruiker",
  guest: "Gast",
};

const ROL_KLEUREN: Record<string, string> = {
  owner: "bg-enervia-600 text-white",
  admin: "bg-enervia-50 text-enervia-700 border border-enervia-600/30",
  manager: "bg-amber-50 text-amber-700 border border-amber-300",
  user: "bg-slate-50 text-slate-700 border border-slate-300",
  guest: "bg-muted text-muted-foreground",
};

export function GebruikersLijst({
  members: initial,
  canEdit,
  currentUserId,
}: {
  members: Member[];
  canEdit: boolean;
  currentUserId: string;
}) {
  const [rows, setRows] = useState<Member[]>(initial);

  async function wijzigRol(userId: string, nieuweRol: string) {
    const origineel = rows.find((r) => r.user_id === userId)?.rol_code;
    setRows((rs) =>
      rs.map((r) => (r.user_id === userId ? { ...r, rol_code: nieuweRol } : r)),
    );
    try {
      const res = await fetch("/api/gebruikers/rol", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user_id: userId, rol_code: nieuweRol }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Update mislukt");
      toast({ title: "Rol bijgewerkt", variant: "success" });
    } catch (err) {
      setRows((rs) =>
        rs.map((r) =>
          r.user_id === userId ? { ...r, rol_code: origineel ?? "user" } : r,
        ),
      );
      toast({
        title: "Fout",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  }

  async function verwijder(userId: string) {
    if (!confirm("Weet je zeker dat je deze gebruiker wil verwijderen?")) return;
    try {
      const res = await fetch(`/api/gebruikers/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Mislukt");
      setRows((rs) => rs.filter((r) => r.user_id !== userId));
      toast({ title: "Gebruiker verwijderd uit workspace", variant: "success" });
    } catch (err) {
      toast({
        title: "Fout",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-3">E-mail</th>
            <th className="text-left px-4 py-3">Rol</th>
            <th className="text-left px-4 py-3">Toegevoegd</th>
            <th className="text-left px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((m) => {
            const isSelf = m.user_id === currentUserId;
            return (
              <tr key={m.user_id} className="hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="font-medium">{m.email ?? m.user_id}</div>
                  {isSelf && (
                    <span className="text-xs text-muted-foreground">
                      (dat ben jij)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {canEdit && !isSelf && !m.is_owner ? (
                    <select
                      className="text-xs rounded border bg-white px-2 py-1"
                      value={m.rol_code}
                      onChange={(e) => wijzigRol(m.user_id, e.target.value)}
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="user">Gebruiker</option>
                      <option value="guest">Gast</option>
                    </select>
                  ) : (
                    <Badge
                      className={ROL_KLEUREN[m.rol_code] ?? ROL_KLEUREN.user}
                    >
                      {ROL_LABELS[m.rol_code] ?? m.rol_code}
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(m.toegevoegd_op).toLocaleDateString("nl-BE")}
                </td>
                <td className="px-4 py-3 text-right">
                  {canEdit && !isSelf && !m.is_owner && (
                    <button
                      onClick={() => verwijder(m.user_id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Verwijderen
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
