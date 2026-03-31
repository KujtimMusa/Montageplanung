import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: sa } = await supabase
    .from("superadmins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sa) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-900/50 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-violet-500/30 bg-violet-600/20">
              <span className="text-[10px] font-bold text-violet-400">SA</span>
            </div>
            <span className="text-sm font-semibold text-zinc-200">Superadmin</span>
            <span className="rounded-full border border-violet-900/40 bg-violet-950/40 px-2 py-0.5 text-[10px] text-violet-400">
              System
            </span>
          </div>
          <a
            href="/dashboard"
            className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            ← Zurück zur App
          </a>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
    </div>
  );
}
