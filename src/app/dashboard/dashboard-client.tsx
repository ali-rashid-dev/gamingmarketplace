"use client";

import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

interface DashboardClientProps {
  name: string;
  email: string;
  role: string;
}

export default function DashboardClient({
  name,
  email,
  role,
}: DashboardClientProps) {
  const router = useRouter();

  return (
    <main className="mx-auto flex h-screen max-w-md flex-col items-center justify-center space-y-4 p-6 text-white">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>Welcome, {name || "User"}!</p>
      <p>Email: {email}</p>
      <p>Account role: {role}</p>
      <button
        onClick={() =>
          signOut({
            fetchOptions: {
              onSuccess: () => router.push("/sign-in"),
            },
          })
        }
        className="w-full rounded-md bg-white px-4 py-2 font-medium text-black hover:bg-gray-200"
      >
        Sign Out
      </button>
    </main>
  );
}
