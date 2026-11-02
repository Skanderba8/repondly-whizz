"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getSupabaseClient } from "@/lib/supabase/client";
import { accessRoleSchema, type WorkspaceAccount } from "./access";
import { LoginForm } from "./login-form";

type AccessState =
  | { status: "loading" | "signed-out" | "denied" | "error" }
  | { status: "ready"; account: WorkspaceAccount };

export function AuthBoundary({ children }: { children: React.ReactNode }) {
  const [access, setAccess] = useState<AccessState>({ status: "loading" });
  const [revision, setRevision] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const requestId = useRef(0);
  const logoutBusy = useRef(false);

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let unsubscribe: (() => void) | undefined;

    try {
      const client = getSupabaseClient();
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        const currentId = ++requestId.current;
        clearTimeout(timer);
        if (disposed) return;
        if (!session) {
          setAccess({ status: "signed-out" });
          return;
        }
        setAccess({ status: "loading" });
        // Keep Supabase requests outside the auth callback's lock.
        timer = setTimeout(() => {
          async function loadAccess() {
            try {
              const { data: identity, error: identityError } = await client.auth.getUser();
              if (identityError || !identity.user || identity.user.id !== session.user.id) {
                throw new Error("Identity could not be verified.");
              }
              const { data: membership, error: membershipError } = await client
                .from("workspace_members")
                .select("role")
                .eq("user_id", identity.user.id)
                .maybeSingle();
              if (membershipError) throw new Error("Access could not be loaded.");
              const role = accessRoleSchema.safeParse(membership?.role);
              if (disposed || currentId !== requestId.current) return;
              setAccess(role.success ? {
                status: "ready",
                account: { userId: identity.user.id, email: identity.user.email ?? "", role: role.data },
              } : { status: "denied" });
            } catch {
              if (!disposed && currentId === requestId.current) setAccess({ status: "error" });
            }
          }
          void loadAccess();
        }, 0);
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch {
      // Environment failures remain closed, including during static preview.
      setAccess({ status: "error" });
    }

    function revalidate() {
      if (document.visibilityState === "visible" && !logoutBusy.current) {
        ++requestId.current;
        setAccess({ status: "loading" });
        setRevision((value) => value + 1);
      }
    }
    window.addEventListener("focus", revalidate);
    return () => {
      disposed = true;
      ++requestId.current;
      clearTimeout(timer);
      unsubscribe?.();
      window.removeEventListener("focus", revalidate);
    };
  }, [revision]);

  function retry() {
    ++requestId.current;
    setAccess({ status: "loading" });
    setRevision((value) => value + 1);
  }

  async function signOut() {
    if (logoutBusy.current) return;
    logoutBusy.current = true;
    ++requestId.current;
    setSigningOut(true);
    setLogoutError("");
    setAccess({ status: "loading" });
    try {
      const { error } = await getSupabaseClient().auth.signOut({ scope: "local" });
      if (error) throw error;
      setAccess({ status: "signed-out" });
    } catch {
      setLogoutError("Logout could not be completed. Check your connection and try again.");
      setAccess({ status: "error" });
    } finally {
      logoutBusy.current = false;
      setSigningOut(false);
    }
  }

  if (signingOut || access.status === "loading") {
    return <main className="flex min-h-svh items-center justify-center px-6"><p role="status" className="text-sm text-muted-foreground">{signingOut ? "Logging out..." : "Checking workspace access..."}</p></main>;
  }
  if (access.status === "signed-out") return <LoginForm />;
  if (access.status === "ready") {
    return <WorkspaceShell account={access.account} onSignOut={signOut}>{children}</WorkspaceShell>;
  }
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-5 px-6 py-12">
      <p className="eyebrow">Whizz Repondly</p>
      <h1 className="text-2xl font-semibold">{access.status === "denied" ? "Workspace access needed" : "Unable to verify access"}</h1>
      <p role="alert" className="text-sm leading-6 text-muted-foreground">{logoutError || (access.status === "denied"
        ? "Your account has no workspace role assigned. Contact your workspace owner."
        : "Check your connection and try again. If this continues, contact your workspace owner.")}</p>
      <div className="flex gap-3">
        <Button onClick={retry} className="min-h-11">Try again</Button>
        <Button variant="outline" onClick={signOut} className="min-h-11">Log out</Button>
      </div>
    </main>
  );
}
