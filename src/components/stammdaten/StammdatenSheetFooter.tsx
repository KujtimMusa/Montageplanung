import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type Props = {
  onCancel: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  disabled?: boolean;
  isSubmitting?: boolean;
};

export function StammdatenSheetFooter({
  onCancel,
  submitLabel = "Speichern",
  cancelLabel = "Abbrechen",
  disabled,
  isSubmitting,
}: Props) {
  return (
    <div className="sticky bottom-0 flex flex-col gap-2 border-t border-zinc-800/60 bg-zinc-950/95 px-6 pb-6 pt-3 backdrop-blur-sm sm:flex-row sm:justify-end">
      <Button
        type="button"
        variant="ghost"
        className="w-full text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 sm:w-auto"
        onClick={onCancel}
      >
        {cancelLabel}
      </Button>
      <Button
        type="submit"
        className="w-full bg-zinc-100 font-semibold text-zinc-900 hover:bg-white sm:w-auto"
        disabled={disabled || isSubmitting}
      >
        {isSubmitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          submitLabel
        )}
      </Button>
    </div>
  );
}
