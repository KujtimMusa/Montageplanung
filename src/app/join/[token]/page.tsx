"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function JoinPage() {
  const params = useParams();
  const tokenParam = params.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState<"pruefen" | "formular" | "fehler" | "ok">(
    "pruefen"
  );
  const [invite, setInvite] = useState<{
    email: string;
    organization_id: string;
    role: string;
    organizations: { name: string }[];
  } | null>(null);
  const [name, setName] = useState("");
  const [passwort, setPasswort] = useState("");
  const [laedt, setLaedt] = useState(false);

  useEffect(() => {
    async function pruefen() {
      if (!token) {
        setStatus("fehler");
        return;
      }

      const { data } = await supabase
        .from("invitations")
        .select("email, organization_id, role, organizations(name)")
        .eq("token", token)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (!data) {
        setStatus("fehler");
        return;
      }
      setInvite(data as unknown as NonNullable<typeof invite>);
      setStatus("formular");
    }
    void pruefen();
  }, [token, supabase]);

  async function annehmen() {
    if (!invite || !token) return;
    setLaedt(true);

    const { data: signUp, error: signUpError } = await supabase.auth.signUp({
      email: invite.email,
      password: passwort,
    });

    if (signUpError || !signUp.user) {
      setStatus("fehler");
      setLaedt(false);
      return;
    }

    await supabase.from("employees").insert({
      name: name || invite.email.split("@")[0],
      email: invite.email,
      role: invite.role,
      active: true,
      auth_user_id: signUp.user.id,
      organization_id: invite.organization_id,
    });

    await supabase
      .from("invitations")
      .update({ used_at: new Date().toISOString() })
      .eq("token", token);

    setStatus("ok");
    setTimeout(() => router.push("/dashboard"), 2000);
  }

  if (status === "pruefen") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 text-sm">
        Einladung wird geprueft...
      </div>
    );
  }

  if (status === "fehler") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-red-400 font-semibold">
            Einladung ungueltig oder abgelaufen
          </p>
          <a href="/login" className="text-xs text-zinc-500 underline">
            Zum Login
          </a>
        </div>
      </div>
    );
  }

  if (status === "ok") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-emerald-400">
        ✓ Willkommen! Du wirst weitergeleitet...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider">
            Einladung
          </p>
          <h1 className="text-2xl font-bold text-zinc-100 mt-1">
            {invite?.organizations?.[0]?.name}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Du wurdest als <span className="text-zinc-300">{invite?.role}</span>{" "}
            eingeladen.
          </p>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Dein Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 text-sm"
          />
          <input
            type="password"
            placeholder="Passwort waehlen"
            value={passwort}
            onChange={(e) => setPasswort(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 text-sm"
          />
          <button
            onClick={() => void annehmen()}
            disabled={laedt || !passwort}
            className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm disabled:opacity-40 transition-all"
          >
            {laedt ? "Wird eingerichtet..." : "Einladung annehmen"}
          </button>
        </div>
      </div>
    </div>
  );
}
