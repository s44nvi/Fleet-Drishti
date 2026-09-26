import { LogOut } from "lucide-react";
import { useAuth } from "../../lib/auth/AuthContext";

// Minimal sign-out control — no prior auth UI existed to match, so this
// follows the sidebar's existing meta-text styling as closely as possible.
export function SignOutButton() {
  const { logout } = useAuth();

  return (
    <button
      type="button"
      onClick={logout}
      className="mt-3 flex items-center gap-1.5 text-meta text-ink-3 hover:text-ink-2"
    >
      <LogOut size={13} aria-hidden="true" />
      Sign out
    </button>
  );
}
