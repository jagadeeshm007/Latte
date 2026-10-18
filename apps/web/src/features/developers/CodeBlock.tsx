import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/** CodeBlock: a labelled snippet with a copy button. */
export function CodeBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <figure className="flex min-w-0 flex-col gap-1.5">
      <figcaption className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
        {label}
        <Button
          size="xs"
          variant="ghost"
          aria-label={`Copy: ${label}`}
          onClick={() => {
            void navigator.clipboard.writeText(code).then(() => {
              setCopied(true);
            });
          }}
        >
          {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </figcaption>
      <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-relaxed text-foreground">
        <code>{code}</code>
      </pre>
    </figure>
  );
}
