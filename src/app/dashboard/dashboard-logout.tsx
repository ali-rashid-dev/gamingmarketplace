"use client";

import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function DashboardLogout() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() =>
        signOut({
          fetchOptions: {
            onSuccess: () => router.push("/sign-in"),
          },
        })
      }
      className="min-h-10 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground transition hover:border-gold/40 hover:text-foreground sm:text-sm"
    >
      Sign out
    </button>
  );
}
