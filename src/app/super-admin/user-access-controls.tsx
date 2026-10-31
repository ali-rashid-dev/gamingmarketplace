"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { revokeUserSessions, changePrivilegedUserRole } from "./actions";
import type { UserRole } from "@/generated/prisma/enums";

const roleOptions: { value: UserRole; label: string }[] = [
  { value: "BUYER", label: "Buyer" },
  { value: "SELLER", label: "Seller" },
  { value: "SUPPORT", label: "Support" },
  { value: "ADMIN", label: "Admin" },
  { value: "SUPER_ADMIN", label: "Super admin" },
];

export function UserAccessControls({
  userId,
  role,
  isSelf,
}: {
  userId: string;
  role: UserRole;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState(role);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();

  function updateRole() {
    if (selectedRole === role || isSelf) return;
    if (!window.confirm(`Change this account's role from ${role} to ${selectedRole}? This change will be audited.`)) return;
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        const result = await changePrivilegedUserRole(userId, selectedRole);
        if (!result.success) throw new Error(result.error);
        setMessage("Role updated and recorded in the audit log.");
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to update account role");
      }
    });
  }

  function revokeSessions() {
    if (isSelf || !window.confirm("Revoke every active session for this account?")) return;
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        const result = await revokeUserSessions(userId);
        if (!result.success) throw new Error(result.error);
        setMessage(`${result.data.revokedSessions} session(s) revoked and recorded in the audit log.`);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to revoke account sessions");
      }
    });
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Account role"
          value={selectedRole}
          disabled={busy || isSelf}
          onChange={(event) => setSelectedRole(event.target.value as UserRole)}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground disabled:opacity-50"
        >
          {roleOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy || isSelf || selectedRole === role}
          onClick={updateRole}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          Save role
        </button>
        <button
          type="button"
          disabled={busy || isSelf}
          onClick={revokeSessions}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
        >
          Revoke sessions
        </button>
      </div>
      {isSelf && <p className="mt-2 text-xs text-muted-foreground">Your own privileged role and sessions cannot be changed here.</p>}
      {message && <p role="status" className="mt-2 text-xs text-emerald-500">{message}</p>}
      {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
