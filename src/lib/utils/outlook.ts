export function outlookKalenderLink(d: {
  firma: string;
  email: string | null;
  vorlauf_tage: number;
}): string {
  const heute = new Date();
  const start = new Date(heute);
  start.setDate(heute.getDate() + (d.vorlauf_tage || 1));

  const fmt = (dt: Date) =>
    dt.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const end = new Date(start);
  end.setHours(start.getHours() + 1);

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    startdt: fmt(start),
    enddt: fmt(end),
    subject: `Besprechung mit ${d.firma}`,
    to: d.email || "",
    body: `Terminanfrage an ${d.firma}`,
  });
  return `https://outlook.office.com/calendar/0/action/compose?${params.toString()}`;
}
