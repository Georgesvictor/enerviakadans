import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublic = createRouteMatcher([
  "/",
  "/over",
  "/prijzen",
  "/functies",
  "/contact",
  "/voorwaarden",
  "/privacy",
  "/sign-in(.*)",
  "/sign-in-direct(.*)",
  "/sign-up(.*)",
  "/onboarding(.*)",
  "/debug(.*)",
  "/dev-login(.*)",
  "/klant/(.*)",
  "/offerte/(.*)",
  "/portaal(.*)",
  "/api/portaal/(.*)",
  "/api/webhooks/(.*)",
  "/api/cron/(.*)",
  "/api/klant/(.*)",
  "/api/offerte-klant/(.*)",
  "/api/tenants/maken",
  "/api/tenants/toetreden",
  "/api/dev-login",
  "/api/debug-auth",
]);

/**
 * Hosts die het klantenportaal serveren. Een request naar portaal.enervia.be
 * wordt intern herschreven naar /portaal/<path>.
 */
const PORTAAL_HOSTS = new Set([
  "portaal.enervia.be",
  "portaal.localhost",
]);

export default clerkMiddleware(async (auth, req) => {
  // ---------- Multi-domain rewrite: portaal.enervia.be → /portaal/* ----------
  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const url = req.nextUrl;
  if (
    PORTAAL_HOSTS.has(host) &&
    !url.pathname.startsWith("/portaal") &&
    !url.pathname.startsWith("/api/portaal") &&
    !url.pathname.startsWith("/_next") &&
    !url.pathname.startsWith("/api/")
  ) {
    const rewritten = url.clone();
    rewritten.pathname = `/portaal${url.pathname === "/" ? "" : url.pathname}`;
    return NextResponse.rewrite(rewritten);
  }

  // Klantenportaal heeft eigen magic-link auth en is ALTIJD publiek.
  // Geen dev-bypass — anders zou dev cookie de klant ten onrechte als admin loggen.
  if (
    url.pathname.startsWith("/portaal") ||
    url.pathname.startsWith("/api/portaal")
  ) {
    return NextResponse.next();
  }

  // DEV-BYPASS: in dev mode is alle authenticatie uitgeschakeld.
  // Iedereen wordt automatisch behandeld als info@enervia.be admin.
  if (process.env.DEV_AUTH_BYPASS === "1") {
    const res = NextResponse.next();
    // Zet de dev-cookie automatisch zodat tenant-context werkt
    if (req.cookies.get("kadans_dev_auth")?.value !== "1") {
      res.cookies.set("kadans_dev_auth", "1", {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });
    }
    return res;
  }

  if (isPublic(req)) return NextResponse.next();
  await auth.protect();
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
