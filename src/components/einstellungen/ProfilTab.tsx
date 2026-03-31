"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2Icon, Lock, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SecretInput } from "@/components/einstellungen/SecretInput";
import { toast } from "sonner";

const profilSchema = z.object({
  name: z.string().min(2, "Mindestens 2 Zeichen."),
});

const passwortSchema = z
  .object({
    passwort: z.string().min(8, "Mindestens 8 Zeichen."),
    passwortWiederholen: z.string().min(1, "Bitte bestätigen."),
  })
  .refine((d) => d.passwort === d.passwortWiederholen, {
    message: "Passwörter stimmen nicht überein.",
    path: ["passwortWiederholen"],
  });

export function ProfilTab() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [mitarbeiterId, setMitarbeiterId] = useState<string | null>(null);
  const [laden, setLaden] = useState(true);
  const [sName, setSName] = useState(false);
  const [sPass, setSPass] = useState(false);
  const [abmelden, setAbmelden] = useState(false);
  const [name, setName] = useState("");

  const profilF = useForm<z.infer<typeof profilSchema>>({
    resolver: zodResolver(profilSchema),
    defaultValues: { name: "" },
  });

  const passwortF = useForm<z.infer<typeof passwortSchema>>({
    resolver: zodResolver(passwortSchema),
    defaultValues: { passwort: "", passwortWiederholen: "" },
  });

  const ladenProfil = useCallback(async () => {
    setLaden(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const u = auth.user;
      if (!u) return;
      setEmail(u.email ?? "");

      const { data: emp } = await supabase
        .from("employees")
        .select("id,name")
        .eq("auth_user_id", u.id)
        .maybeSingle();

      if (emp?.id) {
        setMitarbeiterId(emp.id as string);
        const n = (emp.name as string) ?? "";
        setName(n);
        profilF.reset({ name: n });
      }
    } finally {
      setLaden(false);
    }
  }, [supabase, profilF]);

  useEffect(() => {
    void ladenProfil();
  }, [ladenProfil]);

  async function speichernName(w: z.infer<typeof profilSchema>) {
    if (!mitarbeiterId) {
      toast.error("Kein Mitarbeiter-Datensatz verknüpft.");
      return;
    }
    setSName(true);
    try {
      const { error } = await supabase
        .from("employees")
        .update({ name: w.name.trim() })
        .eq("id", mitarbeiterId);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Name gespeichert.");
      setName(w.name.trim());
    } finally {
      setSName(false);
    }
  }

  async function aendernPasswort(w: z.infer<typeof passwortSchema>) {
    setSPass(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: w.passwort,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Passwort geändert.");
      passwortF.reset({ passwort: "", passwortWiederholen: "" });
    } finally {
      setSPass(false);
    }
  }

  async function abmeldenKlick() {
    setAbmelden(true);
    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setAbmelden(false);
    }
  }

  if (laden) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Loader2Icon className="size-4 animate-spin" />
        Profil wird geladen…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900">
        <div className="border-b border-zinc-800/60 px-5 py-4">
          <p className="text-sm font-semibold text-zinc-200">Persoenliche Daten</p>
        </div>
        <div className="p-5">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-600/20">
              <span className="text-sm font-bold text-violet-400">
                {(name || "U").slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200">{name || "Unbekannt"}</p>
              <p className="text-xs text-zinc-500">{email}</p>
            </div>
          </div>

          <form
            onSubmit={profilF.handleSubmit(speichernName)}
            className="max-w-md space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="profil-name">Name</Label>
              <Input
                id="profil-name"
                className="border-zinc-700 bg-zinc-950"
                {...profilF.register("name")}
              />
              {profilF.formState.errors.name && (
                <p className="text-xs text-red-400">
                  {profilF.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profil-email">E-Mail</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-2.5 size-4 text-zinc-600" />
                <Input
                  id="profil-email"
                  type="email"
                  value={email}
                  disabled
                  className="border-zinc-800 bg-zinc-950/80 pl-9 text-zinc-400"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={sName}
              className="rounded-xl border border-zinc-700/40 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition-all hover:bg-zinc-700 hover:text-zinc-100 disabled:opacity-40"
            >
              {sName ? "Speichern..." : "Speichern"}
            </button>
          </form>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900">
        <div className="border-b border-zinc-800/60 px-5 py-4">
          <p className="text-sm font-semibold text-zinc-200">Sicherheit</p>
        </div>
        <div className="p-5">
          <form
            onSubmit={passwortF.handleSubmit(aendernPasswort)}
            className="max-w-md space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="pw-neu">Neues Passwort</Label>
              <SecretInput
                id="pw-neu"
                className="w-full"
                inputClassName="border-zinc-700 bg-zinc-950"
                {...passwortF.register("passwort")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw-wdh">Passwort bestätigen</Label>
              <SecretInput
                id="pw-wdh"
                className="w-full"
                inputClassName="border-zinc-700 bg-zinc-950"
                {...passwortF.register("passwortWiederholen")}
              />
            </div>
            {passwortF.formState.errors.passwort && (
              <p className="text-xs text-red-400">
                {passwortF.formState.errors.passwort.message}
              </p>
            )}
            {passwortF.formState.errors.passwortWiederholen && (
              <p className="text-xs text-red-400">
                {passwortF.formState.errors.passwortWiederholen.message}
              </p>
            )}
            <button
              type="submit"
              disabled={sPass}
              className="rounded-xl border border-zinc-700/40 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition-all hover:bg-zinc-700 hover:text-zinc-100 disabled:opacity-40"
            >
              {sPass ? "Speichern..." : "Passwort aendern"}
            </button>
          </form>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900">
        <div className="border-b border-zinc-800/60 px-5 py-4">
          <p className="text-sm font-semibold text-zinc-200">Sitzung</p>
        </div>
        <div className="space-y-3 p-5">
          <p className="text-xs text-zinc-500">Du bist eingeloggt als {email}</p>
          <button
            type="button"
            disabled={abmelden}
            onClick={() => void abmeldenKlick()}
            className="inline-flex items-center gap-2 rounded-xl border border-red-900/40 bg-red-950/30 px-3 py-2 text-xs font-medium text-red-300 transition-all hover:bg-red-950/50 disabled:opacity-40"
          >
            {abmelden ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
            Abmelden
          </button>
        </div>
      </div>
    </div>
  );
}
