import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { PlayIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { demoStatusQuery, startDemo } from "./demo";

/**
 * DemoButton: "Experience the app", shown only while the demo is on
 * (ADR-0033). It signs the visitor in to the demo and opens the dashboard.
 */
export function DemoButton({ size = "lg" }: { size?: "default" | "lg" }) {
  const status = useQuery(demoStatusQuery);
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!status.data?.enabled) return null;

  async function onClick() {
    setPending(true);
    setError(null);
    try {
      await startDemo();
      await navigate({ to: "/dashboard" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "The demo could not start. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button size={size} variant="secondary" loading={pending} onClick={() => void onClick()}>
        <PlayIcon aria-hidden="true" />
        Experience the app
      </Button>
      <p className="text-xs text-muted-foreground">
        Sample data. One transcript upload. No sign-up.
      </p>
      {error ? (
        <p role="alert" className="text-xs text-destructive-foreground">
          {error}
        </p>
      ) : null}
    </div>
  );
}
