import { createAuthClient } from "better-auth/react";

export const { requestPasswordReset, resetPassword, signIn, signUp, signOut, useSession } =
	createAuthClient();
