"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

const schema = z
  .object({
    name: z.string().min(2, "Mindestens 2 Zeichen."),
    email: z.string().email("Gültige E-Mail eingeben."),
    passwort: z.string().min(8, "Mindestens 8 Zeichen."),
    passwortWiederholen: z.string(),
  })
  .refine((d) => d.passwort === d.passwortWiederholen, {
    message: "Passwörter stimmen nicht überein.",
    path: ["passwortWiederholen"],
  });

type FormularWerte = z.infer<typeof schema>;

/**
 * Registrierung mit E-Mail-Bestätigung (Supabase).
 */
export default function RegisterSeite() {
  const [erfolg, setErfolg] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormularWerte>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      passwort: "",
      passwortWiederholen: "",
    },
  });

  async function onSubmit(werte: FormularWerte) {
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: werte.email.trim().toLowerCase(),
      password: werte.passwort,
      options: {
        data: { name: werte.name.trim() },
      },
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    setErfolg(true);
  }

  if (erfolg) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Konto angelegt</CardTitle>
          <CardDescription>Fast geschafft.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTitle>E-Mail bestätigen</AlertTitle>
            <AlertDescription>
              Bitte bestätige deine E-Mail-Adresse über den Link, den wir dir
              geschickt haben. Danach kannst du dich anmelden.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "default" }), "w-full")}
          >
            Zur Anmeldung
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Registrieren</CardTitle>
        <CardDescription>
          Konto anlegen — du erhältst eine E-Mail zur Bestätigung.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              autoComplete="name"
              {...register("name")}
              placeholder="Vor- und Nachname"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
              placeholder="name@firma.de"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="passwort">Passwort</Label>
            <Input
              id="passwort"
              type="password"
              autoComplete="new-password"
              {...register("passwort")}
            />
            {errors.passwort && (
              <p className="text-sm text-destructive">
                {errors.passwort.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="passwortWiederholen">Passwort wiederholen</Label>
            <Input
              id="passwortWiederholen"
              type="password"
              autoComplete="new-password"
              {...register("passwortWiederholen")}
            />
            {errors.passwortWiederholen && (
              <p className="text-sm text-destructive">
                {errors.passwortWiederholen.message}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Wird gesendet…" : "Konto erstellen"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Schon ein Konto?{" "}
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Anmelden
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
