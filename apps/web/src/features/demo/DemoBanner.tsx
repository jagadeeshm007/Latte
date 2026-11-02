import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/session";

/** DemoBanner tells a visitor they are in the demo, with the way out (ADR-0033). */
export function DemoBanner() {
  return (
    <Alert variant="info">
      <AlertTitle>Demo mode: sample data</AlertTitle>
      <AlertDescription>
        These calls are scripted examples. You can upload one transcript of your own and see it
        scored; it is deleted after a day.
      </AlertDescription>
      <AlertAction>
        <Button size="sm" variant="outline" onClick={() => void signOut()}>
          Exit demo
        </Button>
      </AlertAction>
    </Alert>
  );
}
