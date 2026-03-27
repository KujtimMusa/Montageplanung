"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2Icon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
        profilF.reset({ name: (emp.name as string) ?? "" });
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
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-zinc-50">Persönliche Daten</CardTitle>
          <CardDescription className="text-zinc-500">
            Name und Anmeldung
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={profilF.handleSubmit(speichernName)} className="space-y-4 max-w-md">
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
              <Input
                id="profil-email"
                type="email"
                value={email}
                disabled
                className="border-zinc-800 bg-zinc-950/80 text-zinc-400"
              />
            </div>
            <Button type="submit" disabled={sName}>
              {sName && <Loader2Icon className="mr-2 size-4 animate-spin" />}
              Speichern
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator className="bg-zinc-800" />

      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-zinc-50">Passwort ändern</CardTitle>
          <CardDescription className="text-zinc-500">
            Mindestens 8 Zeichen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={passwortF.handleSubmit(aendernPasswort)}
            className="space-y-4 max-w-md"
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
            <Button type="submit" disabled={sPass}>
              {sPass && <Loader2Icon className="mr-2 size-4 animate-spin" />}
              Passwort ändern
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator className="bg-zinc-800" />

      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-zinc-50">Sitzung</CardTitle>
          <CardDescription className="text-zinc-500">
            Sicher abmelden
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="destructive"
            disabled={abmelden}
            onClick={() => void abmeldenKlick()}
          >
            {abmelden && <Loader2Icon className="mr-2 size-4 animate-spin" />}
            Abmelden
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
