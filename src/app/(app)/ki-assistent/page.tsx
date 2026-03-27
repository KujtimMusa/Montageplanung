import { redirect } from "next/navigation";

/** @deprecated Nutze /ki */
export default function KiAssistentRoute() {
  redirect("/ki");
}
