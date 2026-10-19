import { EyeIcon, EyeOffIcon, ShieldIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * PiiNotice: how much personal data is hidden in this call's transcript, and
 * for QA and managers a way to show it. Each reveal is recorded (ADR-0023).
 */
export function PiiNotice({
  redactions,
  revealed,
  canReveal,
  onToggle,
}: {
  redactions: number;
  revealed: boolean;
  canReveal: boolean;
  onToggle: () => void;
}) {
  if (!revealed && redactions === 0) return null;
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground"
    >
      <ShieldIcon aria-hidden="true" className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        {revealed
          ? "Personal data is shown. Viewing it was recorded."
          : `${String(redactions)} piece${redactions === 1 ? "" : "s"} of personal data ${redactions === 1 ? "is" : "are"} hidden, such as card, Aadhaar or phone numbers.`}
      </span>
      {canReveal ? (
        <Button variant="outline" size="xs" onClick={onToggle}>
          {revealed ? <EyeOffIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
          {revealed ? "Hide personal data" : "Reveal personal data"}
        </Button>
      ) : null}
    </div>
  );
}
