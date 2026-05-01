import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { getKlantSession } from "@/lib/klantportaal/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getKlantSession();
  if (!session) {
    return NextResponse.redirect(`${req.nextUrl.origin}/portaal/login`);
  }
  const { id } = await params;
  const supabase = createAdminSupabaseClient();

  // Toegang controle
  const { data: o } = await supabase
    .from("quotations")
    .select("id, contact_id, company_id, tenant_id, status")
    .eq("id", id)
    .eq("tenant_id", session.tenant_id)
    .maybeSingle();
  if (
    !o ||
    (o.contact_id !== session.contact_id &&
      o.company_id !== session.company_id)
  ) {
    return NextResponse.json({ error: "geen toegang" }, { status: 404 });
  }

  await supabase
    .from("quotations")
    .update({
      status: "geaccepteerd",
      klant_akkoord_op: new Date().toISOString(),
      klant_akkoord_ip:
        req.headers.get("x-forwarded-for") ??
        req.headers.get("x-real-ip") ??
        null,
    })
    .eq("id", id);

  await supabase.from("audit_log").insert({
    tenant_id: session.tenant_id,
    actie: "klantportaal_offerte_geaccepteerd",
    metadata: { quotation_id: id, email: session.email },
  });

  return NextResponse.redirect(`${req.nextUrl.origin}/portaal/offerte/${id}`, {
    status: 303,
  });
}
