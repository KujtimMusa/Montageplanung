import { NotfallModus } from "@/components/notfall/NotfallModus";

export default function NotfallSeite() {
  return (
    <div className="flex min-h-0 flex-1 flex-col p-4 md:p-6">
      <div className="min-h-0 flex-1 rounded-2xl border border-red-900/30 bg-red-950/20 p-4 md:p-6">
        <NotfallModus />
      </div>
    </div>
  );
}
