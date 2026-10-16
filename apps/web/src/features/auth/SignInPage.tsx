import { AudioWaveformIcon } from "lucide-react";
import { useState, type SubmitEvent } from "react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { signIn } from "./session";

/** S1: sign in with the email and password Supabase Auth holds (US-00-003). */
export function SignInPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const text = (name: string) => {
      const value = form.get(name);
      return typeof value === "string" ? value : "";
    };
    const failure = await signIn(text("email"), text("password"));
    setPending(false);
    if (failure)
      setError(
        failure === "Invalid login credentials" ? "That email and password do not match." : failure,
      );
  }

  return (
    <main className="relative flex min-h-svh items-center justify-center bg-muted/40 px-4">
      <ThemeToggle className="absolute end-4 top-4" />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <span className="mb-2 flex size-10 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-sm [&_svg]:size-5">
            <AudioWaveformIcon aria-hidden="true" />
          </span>
          <CardTitle className="text-xl">Latte</CardTitle>
          <CardDescription>
            Sign in to review calls, coach agents and track compliance.
          </CardDescription>
        </CardHeader>
        <CardPanel>
          <form className="flex flex-col gap-4" onSubmit={(e) => void onSubmit(e)} noValidate>
            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input name="email" type="email" autoComplete="username" required />
            </Field>
            <Field invalid={error !== null}>
              <FieldLabel>Password</FieldLabel>
              <Input name="password" type="password" autoComplete="current-password" required />
              {error ? <FieldError match>{error}</FieldError> : null}
            </Field>
            <Button type="submit" loading={pending}>
              Sign in
            </Button>
          </form>
        </CardPanel>
      </Card>
    </main>
  );
}
