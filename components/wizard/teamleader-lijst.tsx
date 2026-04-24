"use client";

import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatEur, formatDate } from "@/lib/utils/format";
import { Link as LinkIcon, ExternalLink } from "lucide-react";
import Link from "next/link";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

interface TLQuotation {
  id: string;
  number: string;
  status: string;
  date: string;
  total: { amount: number; currency: string };
}

export function TeamleaderQuotationsLijst({
  onChoose,
  loading,
}: {
  onChoose: (quotationId: string) => void;
  loading: boolean;
}) {
  const { data, error, isLoading } = useSWR<{ quotations: TLQuotation[] }>(
    "/api/teamleader/quotations",
    fetcher,
  );

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-6">Quotations laden...</p>;
  }

  if (error) {
    return (
      <div className="py-6 text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          Geen Teamleader-verbinding gevonden.
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard/teamleader">
            <LinkIcon className="h-4 w-4" /> Verbind met Teamleader
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto">
      {data?.quotations?.map((q) => (
        <div
          key={q.id}
          className="flex items-center justify-between p-3 rounded-md border border-enervia-100 hover:bg-enervia-50"
        >
          <div>
            <div className="font-medium">{q.number}</div>
            <div className="text-xs text-muted-foreground">
              {formatDate(q.date)} · <Badge variant="secondary">{q.status}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-semibold text-enervia-600">
                {formatEur(q.total?.amount ?? 0, true)}
              </div>
            </div>
            <Button size="sm" disabled={loading} onClick={() => onChoose(q.id)}>
              <ExternalLink className="h-4 w-4" />
              Importeer
            </Button>
          </div>
        </div>
      ))}
      {data?.quotations?.length === 0 && (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Geen recente quotations gevonden in Teamleader.
        </p>
      )}
    </div>
  );
}
