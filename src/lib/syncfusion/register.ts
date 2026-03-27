"use client";

import { registerLicense } from "@syncfusion/ej2-base";

let registered = false;

export function registerSyncfusion() {
  if (registered) return;
  registerLicense(process.env.NEXT_PUBLIC_SYNCFUSION_KEY ?? "");
  registered = true;
}
