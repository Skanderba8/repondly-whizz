"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getSupabaseClient } from "@/lib/supabase/client";
import { loginSchema } from "./access";

export function LoginForm() {
  const busy = useRef(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
    setError("");
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    busy.current = true;
    setPending(true);
    try {
      const { error: authError } = await getSupabaseClient().auth.signInWithPassword(parsed.data);
      if (authError) {
        setError(authError.status === 429
          ? "Too many attempts. Wait a moment before trying again."
          : "Unable to log in. Check your email and password, or contact your workspace owner.");
        requestAnimationFrame(() => errorRef.current?.focus());
      }
    } catch {
      setError("Unable to connect. Check your connection and try again.");
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <main id="main-content" className="flex min-h-svh items-center justify-center px-6 py-12">
      <section aria-labelledby="login-title" className="w-full max-w-sm rounded-2xl border border-border bg-card p-7 sm:p-9">
        <p className="eyebrow">Whizz Repondly</p>
        <h1 id="login-title" className="mt-4 text-3xl font-semibold tracking-tight">Welcome back.</h1>
        <p id="login-help" className="mt-3 text-sm leading-6 text-muted-foreground">Log in with the work email and password provided by your workspace owner.</p>
        <form onSubmit={handleSubmit} aria-describedby="login-help" className="mt-8">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Work email</FieldLabel>
              <Input id="email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required readOnly={pending} className="min-h-11" />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input id="password" name="password" type="password" autoComplete="current-password" required readOnly={pending} className="min-h-11" />
            </Field>
            {error ? <p ref={errorRef} tabIndex={-1} role="alert" className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={pending} className="min-h-11 w-full">{pending ? "Logging in..." : "Log in"}</Button>
            <span role="status" className="sr-only">{pending ? "Logging in. Please wait." : ""}</span>
          </FieldGroup>
        </form>
        <p className="mt-6 text-xs leading-5 text-muted-foreground">Need access or help with your password? Contact your workspace owner.</p>
      </section>
    </main>
  );
}
