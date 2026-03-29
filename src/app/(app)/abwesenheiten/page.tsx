"use client";

import { AbwesenheitenVerwaltung } from "@/components/abwesenheiten/AbwesenheitenVerwaltung";

export default function AbwesenheitenSeite() {
  return (
    <div className="space-y-6">
      {/*
        TODO: HR-System Integration (Personio / andere)
        - API-Anbindung für automatischen Abgleich
        - Wird als separates Feature implementiert
        - Geplant: eigene Einstellungsseite unter /einstellungen/integrationen
      */}
      <AbwesenheitenVerwaltung />
    </div>
  );
}
