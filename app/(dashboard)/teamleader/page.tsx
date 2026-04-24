import { auth } from "@clerk/nextjs/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link2, CheckCircle2, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TeamleaderPage({
  searchParams,
}: {
  searchParams: { ok?: string; err?: string };
}) {
  const { userId } = await auth();
  const supabase = createAdminSupabaseClient();
  const { data: tokens } = await supabase
    .from("teamleader_tokens")
    .select("expires_at, updated_at")
    .eq("user_id", userId ?? "")
    .single();

  const connected = !!tokens;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Teamleader verbinding</CardTitle>
        <CardDescription>
          Haal offertes rechtstreeks uit Teamleader Focus.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {searchParams.ok && (
          <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Succesvol gekoppeld aan Teamleader.
          </div>
        )}
        {searchParams.err && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Koppeling mislukt: {searchParams.err}
          </div>
        )}

        <div className="flex items-center justify-between p-4 border rounded-md border-enervia-100">
          <div>
            <div className="font-medium">
              Status:{" "}
              <Badge variant={connected ? "success" : "outline"}>
                {connected ? "Verbonden" : "Niet verbonden"}
              </Badge>
            </div>
            {connected && tokens?.expires_at && (
              <div className="text-xs text-muted-foreground mt-1">
                Token geldig tot{" "}
                {new Date(tokens.expires_at).toLocaleString("nl-BE")}
              </div>
            )}
          </div>
          <Button asChild>
            <a href="/api/teamleader/oauth">
              <Link2 className="h-4 w-4" />
              {connected ? "Opnieuw koppelen" : "Koppel met Teamleader"}
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
