import { redirect } from "next/navigation";

export default async function PwaKoordinatorEntry({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  redirect(`/pwa/${token}/dashboard`);
}
