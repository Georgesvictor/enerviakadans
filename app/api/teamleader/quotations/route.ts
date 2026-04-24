import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listQuotations } from "@/lib/teamleader/quotations";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const quotations = await listQuotations(userId, 50);
    return NextResponse.json({ quotations });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
