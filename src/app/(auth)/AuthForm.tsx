"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp, type AuthState } from "./actions";

export default function AuthForm({ mode, next, email }: { mode: "login" | "signup"; next: string; email?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? signIn : signUp, {});
  const other = mode === "login" ? "/signup" : "/login";
  return (
    <form action={action} className="panel stack" style={{ gap: 14 }}>
      <input type="hidden" name="next" value={next} />
      {mode === "signup" && (
        <>
          <div className="field">
            <label htmlFor="full_name">Full name</label>
            <input id="full_name" name="full_name" required autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="phone">Mobile number</label>
            <input id="phone" name="phone" required autoComplete="tel" />
          </div>
        </>
      )}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" defaultValue={email} />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </div>
      {mode === "signup" && (
        <>
          <label className="check">
            <input type="checkbox" name="popia" required />
            <span>
              I have read the <Link href="/privacy">privacy notice</Link> and agree that Training Africa Academy processes my details to
              enrol me and keep my learner record. (Required)
            </span>
          </label>
          <label className="check">
            <input type="checkbox" name="marketing" />
            <span>Send me course news and offers. You can unsubscribe at any time. (Optional)</span>
          </label>
        </>
      )}
      {state.error && <p className="form-error">{state.error}</p>}
      {state.message && <p className="form-ok">{state.message}</p>}
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
      </button>
      <p className="small muted">
        {mode === "login" ? "New here? " : "Already have an account? "}
        <Link href={`${other}?next=${encodeURIComponent(next)}`}>{mode === "login" ? "Create an account" : "Log in"}</Link>
      </p>
    </form>
  );
}
