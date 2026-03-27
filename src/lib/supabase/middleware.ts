import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Routen ohne Login (Whitelist). */
function istOeffentlicheRoute(pfad: string): boolean {
  if (pfad === "" || pfad === "/") return true;
  if (pfad === "/login" || pfad === "/register") return true;
  if (pfad.startsWith("/auth/")) return true;
  return false;
}

/** Routen, die eine Session erzwingen (Prefix-Match inkl. Unterpfade). */
function istGeschuetzteRoute(pfad: string): boolean {
  if (pfad.startsWith("/api/")) return true;

  /* Fehlt eine App-Route (z. B. /benachrichtigungen)? → Prefix hier ergänzen. */
  const prefixe = [
    "/dashboard",
    "/planung",
    "/projekte",
    "/mitarbeiter",
    "/kunden",
    "/abteilungen",
    "/abwesenheiten",
    "/dienstleister",
    "/notfall",
    "/einstellungen",
    "/teams",
    "/ki-assistent",
    "/benachrichtigungen",
  ];

  return prefixe.some(
    (p) => pfad === p || pfad.startsWith(`${p}/`)
  );
}

/** Next-/PWA-Assets: kein Login, nur Session-Cookies aktualisieren. */
function istInternesOderStatischesAsset(pfad: string): boolean {
  return (
    pfad.startsWith("/_next") ||
    pfad === "/manifest.json" ||
    pfad === "/icon.svg" ||
    pfad === "/sw.js" ||
    pfad.startsWith("/workbox")
  );
}

/**
 * Supabase-Session aktualisieren und Zugriff auf öffentliche vs. geschützte Routen steuern.
 */
export async function updateSession(request: NextRequest) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next({ request });
  }

  let supabaseAntwort = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseAntwort = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseAntwort.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pfad = request.nextUrl.pathname;

  if (istInternesOderStatischesAsset(pfad)) {
    return supabaseAntwort;
  }

  if (user) {
    if (
      pfad === "/" ||
      pfad === "/login" ||
      pfad === "/register" ||
      pfad === ""
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return supabaseAntwort;
  }

  if (!user && istGeschuetzteRoute(pfad)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("weiter", pfad);
    return NextResponse.redirect(url);
  }

  if (!user && istOeffentlicheRoute(pfad)) {
    return supabaseAntwort;
  }

  return supabaseAntwort;
}
