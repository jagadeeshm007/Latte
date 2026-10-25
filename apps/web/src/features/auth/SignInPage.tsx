import { Link } from "@tanstack/react-router";
import { Building2Icon } from "lucide-react";
import { useState, type SubmitEvent } from "react";

import { LatteMark } from "@/components/LatteMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { env } from "@/lib/env";

import { signIn, signInWithProvider, signInWithSso } from "./session";

const PROVIDER_LABEL = {
  google: "Continue with Google",
  azure: "Continue with Microsoft",
} as const;

/**
 * S1: sign in with an email and password, or with Google, Microsoft or the
 * company's SAML sign-in where they are set up (US-00-003, ADR-0024). Latte
 * is invite-only: whichever way someone signs in, the API lets them in only
 * if a manager invited them.
 */
export function SignInPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState("");
  const providers = env.VITE_AUTH_PROVIDERS;
  const oauth = providers.filter((p): p is "google" | "azure" => p !== "saml");

  async function run(attempt: Promise<string | null>) {
    setPending(true);
    setError(null);
    const failure = await attempt;
    setPending(false);
    if (failure) setError(failure);
  }

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
    <main className="relative flex min-h-svh flex-col items-center justify-center gap-4 bg-muted/40 px-4">
      <ThemeToggle className="absolute end-4 top-4" />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <LatteMark className="mb-2 size-10" />
          <CardTitle className="text-xl">Latte</CardTitle>
          <CardDescription>
            Sign in to review calls, coach agents and track compliance.
          </CardDescription>
        </CardHeader>
        <CardPanel>
          <form className="flex flex-col gap-4" onSubmit={(e) => void onSubmit(e)} noValidate>
            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input
                name="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
              />
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
          {providers.length > 0 ? (
            <div className="mt-4 flex flex-col gap-2">
              <p className="flex items-center gap-2 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
                or
              </p>
              {oauth.map((p) => (
                <Button
                  key={p}
                  variant="outline"
                  disabled={pending}
                  onClick={() => void run(signInWithProvider(p))}
                >
                  {PROVIDER_LABEL[p]}
                </Button>
              ))}
              {providers.includes("saml") ? (
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() => void run(signInWithSso(email))}
                >
                  <Building2Icon aria-hidden="true" />
                  Sign in with your company (SSO)
                </Button>
              ) : null}
              <p className="text-center text-xs text-muted-foreground">
                Only people a manager has invited can sign in.
              </p>
            </div>
          ) : null}
        </CardPanel>
      </Card>
      <nav aria-label="About Latte" className="flex flex-wrap justify-center gap-x-4 text-xs">
        <Link to="/" className="text-muted-foreground hover:text-foreground">
          About Latte
        </Link>
        <Link to="/docs" className="text-muted-foreground hover:text-foreground">
          Docs
        </Link>
        <Link
          to="/legal/$page"
          params={{ page: "terms" }}
          className="text-muted-foreground hover:text-foreground"
        >
          Terms
        </Link>
        <Link
          to="/legal/$page"
          params={{ page: "privacy" }}
          className="text-muted-foreground hover:text-foreground"
        >
          Privacy
        </Link>
      </nav>
    </main>
  );
}
