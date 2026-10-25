import { LatteMark } from "@/components/LatteMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import type { PasswordNeeded } from "@/lib/arrival";

import { NewPasswordForm } from "./NewPasswordForm";
import { signOut } from "./session";

const COPY: Record<PasswordNeeded, { title: string; description: string }> = {
  invite: {
    title: "Choose a password",
    description: "Welcome to Latte. Choose a password so you can sign in again later",
  },
  recovery: {
    title: "Choose a new password",
    description: "Set a new password for",
  },
};

/**
 * SetPasswordPage: the first screen after an invite or a reset link
 * (SCC-7-1). RootLayout shows it instead of the app until a password is set,
 * so following the link cannot leave someone signed in with no way back.
 */
export function SetPasswordPage({ reason, email }: { reason: PasswordNeeded; email: string }) {
  const copy = COPY[reason];
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center gap-4 bg-muted/40 px-4">
      <ThemeToggle className="absolute end-4 top-4" />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <LatteMark className="mb-2 size-10" />
          <CardTitle className="text-xl" role="heading" aria-level={1}>
            {copy.title}
          </CardTitle>
          <CardDescription>
            {reason === "invite"
              ? `${copy.description} as ${email}.`
              : `${copy.description} ${email}.`}
          </CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col gap-3">
          <NewPasswordForm submitLabel="Save password" pendingLabel="Saving" />
          <Button variant="ghost" size="sm" className="self-start" onClick={() => void signOut()}>
            Sign out instead
          </Button>
        </CardPanel>
      </Card>
    </main>
  );
}
