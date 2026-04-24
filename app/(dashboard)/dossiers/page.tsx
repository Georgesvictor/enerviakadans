import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatEur } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function DossiersPage() {
  const { userId } = await auth();
  const supabase = createAdminSupabaseClient();
  const { data: dossiers } = await supabase
    .from("dossiers")
    .select(
      `id, offerte_referentie, status, created_at, auto_verwijder_op,
       klant:klanten(voornaam, achternaam),
       premie:premie_simulaties(totaal_premies),
       extractie:offerte_extracties(gestructureerde_data)`,
    )
    .eq("verkoper_id", userId ?? "")
    .order("created_at", { ascending: false });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alle dossiers</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Referentie</TableHead>
              <TableHead>Klant</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Investering</TableHead>
              <TableHead className="text-right">Premies</TableHead>
              <TableHead>Aangemaakt</TableHead>
              <TableHead>Auto-delete</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dossiers?.map((d) => {
              const invest =
                (d.extractie as any)?.[0]?.gestructureerde_data?.totaal_incl_btw ?? 0;
              return (
                <TableRow key={d.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/dossiers/${d.id}`}
                      className="font-medium text-enervia-600 hover:underline"
                    >
                      {d.offerte_referentie ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {(d.klant as any)?.voornaam} {(d.klant as any)?.achternaam}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        d.status === "compleet" || d.status === "gedeeld"
                          ? "success"
                          : "secondary"
                      }
                    >
                      {d.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatEur(invest, true)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-accent-400">
                    {formatEur((d.premie as any)?.[0]?.totaal_premies ?? 0, true)}
                  </TableCell>
                  <TableCell>{formatDate(d.created_at!)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(d.auto_verwijder_op!)}
                  </TableCell>
                </TableRow>
              );
            })}
            {(!dossiers || dossiers.length === 0) && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nog geen dossiers.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
