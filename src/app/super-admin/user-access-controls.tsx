"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { UserRole } from "@/generated/prisma/enums";
import { revokeUserSessions, setUserRoles } from "./actions";

const roleOptions: { value: UserRole; label: string }[] = [
  { value: "BUYER", label: "Buyer" },
  { value: "SELLER", label: "Seller" },
  { value: "SUPPORT", label: "Support" },
  { value: "ADMIN", label: "Admin" },
  { value: "SUPER_ADMIN", label: "Super admin" },
];

export function UserAccessControls({
  userId,
  roles,
  isSelf,
}: {
  userId: string;
  roles: UserRole[];
  isSelf: boolean;
}) {
  const router = useRouter();
  const [selectedRoles, setSelectedRoles] = useState(roles);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();

  function toggleRole(role: UserRole, checked: boolean) {
    setSelectedRoles((current) => {
      if (checked) return current.includes(role) ? current : [...current, role];
      return current.filter((value) => value !== role);
    });
  }

  function updateRoles() {
    if (isSelf || selectedRoles.length === roles.length && roles.every((role) => selectedRoles.includes(role))) return;
    if (selectedRoles.length === 0) return;
    if (!window.confirm(`Update this account's role assignments? The change will be audited.`)) return;
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        const result = await setUserRoles(userId, selectedRoles);
        if (!result.success) throw new Error(result.error);
        setSelectedRoles(result.data.roles);
        setMessage("Role assignments updated and recorded in the audit log.");
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to update account roles");
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
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {roleOptions.map(({ value, label }) => (
          <Label key={value} className="text-xs">
            <Checkbox
              checked={selectedRoles.includes(value)}
              disabled={busy || isSelf}
              onCheckedChange={(checked) => toggleRole(value, checked === true)}
              aria-label={`${label} role`}
            />
            {label}
          </Label>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={
            busy ||
            isSelf ||
            selectedRoles.length === 0 ||
            selectedRoles.length === roles.length && roles.every((role) => selectedRoles.includes(role))
          }
          onClick={updateRoles}
        >
          Save roles
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy || isSelf}
          onClick={revokeSessions}
        >
          Revoke sessions
        </Button>
      </div>
      {isSelf && <p className="mt-2 text-xs text-muted-foreground">Your own role assignments and sessions cannot be changed here.</p>}
      {message && <p role="status" className="mt-2 text-xs text-emerald-500">{message}</p>}
      {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
