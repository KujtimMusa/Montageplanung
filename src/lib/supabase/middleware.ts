import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Aktualisiert die Supabase-Session in der Middleware (Cookie-Refresh).
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

  // API: Session aktualisieren, aber kein Login-Zwang (Webhooks / Cron später eigen prüfen)
  if (pfad.startsWith("/api/")) {
    return supabaseAntwort;
  }

  const istOeffentlich =
    pfad === "/login" ||
    pfad.startsWith("/auth/") ||
    pfad.startsWith("/_next") ||
    pfad === "/manifest.json" ||
    pfad === "/icon.svg" ||
    pfad === "/sw.js" ||
    pfad.startsWith("/workbox");

  const istGeschuetzt = !istOeffentlich && pfad !== "/";

  if (!user && istGeschuetzt) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("weiter", pfad);
    return NextResponse.redirect(url);
  }

  if (user && pfad === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseAntwort;
}
