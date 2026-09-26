import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { Button, Panel } from "../../components/ui";
import { useAuth } from "../../lib/auth/AuthContext";

// Standalone screen (outside AppShell — no sidebar/nav until logged in).
// Backend has no signup/registration flow; this only authenticates against
// existing Authority accounts (see POST /auth/login).
export function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    const redirectTo = (location.state as { from?: string } | null)?.from ?? "/";
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      const redirectTo = (location.state as { from?: string } | null)?.from ?? "/";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-canvas px-4">
      <Panel className="w-full max-w-sm p-6 flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-action-soft text-action">
            <LogIn size={20} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <h1 className="text-title text-ink">Fleet Drishti</h1>
          <p className="text-meta text-ink-3">Sign in with your authority account</p>
        </div>

        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1 text-meta text-ink-2">
            Email
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-9 rounded-md border border-line-strong bg-surface px-3 text-item text-ink outline-none focus:border-action"
            />
          </label>

          <label className="flex flex-col gap-1 text-meta text-ink-2">
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-9 rounded-md border border-line-strong bg-surface px-3 text-item text-ink outline-none focus:border-action"
            />
          </label>

          {error && (
            <p role="alert" className="text-meta text-red-600">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" disabled={submitting} className="w-full mt-1">
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Panel>
    </div>
  );
}
