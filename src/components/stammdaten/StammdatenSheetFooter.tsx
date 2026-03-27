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
    <div className="sticky bottom-0 flex flex-col gap-2 border-t border-zinc-800/90 bg-zinc-950/95 px-4 py-4 backdrop-blur-sm sm:flex-row sm:justify-end">
      <Button
        type="button"
        variant="secondary"
        className="w-full sm:w-auto"
        onClick={onCancel}
      >
        {cancelLabel}
      </Button>
      <Button
        type="submit"
        className="w-full sm:w-auto"
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
