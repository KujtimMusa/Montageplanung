"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

function LoginFormular() {
  const router = useRouter();
  const suchParams = useSearchParams();
  const weiter = suchParams.get("weiter") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [laedt, setLaedt] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLaedt(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: passwort,
    });
    setLaedt(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Angemeldet");
    router.push(weiter);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Anmelden</CardTitle>
        <CardDescription>
          Monteurplanung — E-Mail und Passwort eingeben.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@firma.de"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="passwort">Passwort</Label>
            <Input
              id="passwort"
              type="password"
              autoComplete="current-password"
              required
              value={passwort}
              onChange={(e) => setPasswort(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={laedt}>
            {laedt ? "Wird angemeldet…" : "Anmelden"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Microsoft SSO (Entra ID) kann in Phase 4 ergänzt werden.
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

function LoginFallback() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-full" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

/**
 * Login mit E-Mail und Passwort (Supabase Auth).
 */
export default function LoginSeite() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginFormular />
    </Suspense>
  );
}
