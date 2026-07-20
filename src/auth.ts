import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { authConfig } from "@/auth.config";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";

class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified";
}

class RateLimitedError extends CredentialsSignin {
  code = "rate_limited";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const h = await headers();
        const ip = await clientIpFromHeaders(h);
        const emailKey = email.toLowerCase().trim();
        const allowed = await rateLimit(`login:${ip}:${emailKey}`, 10, 15 * 60);
        if (!allowed) {
          throw new RateLimitedError();
        }

        const db = await getDb();
        // Prefer verified matches — recovery can leave duplicate email rows.
        const matches = await db
          .select()
          .from(users)
          .where(eq(users.email, emailKey));

        let user = null as (typeof matches)[number] | null;
        for (const candidate of matches) {
          if (!(await bcrypt.compare(password, candidate.passwordHash))) continue;
          if (!user || (candidate.emailVerified && !user.emailVerified)) {
            user = candidate;
          }
          if (candidate.emailVerified) break;
        }

        if (!user) return null;

        if (!user.emailVerified) {
          throw new EmailNotVerifiedError();
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          sessionVersion: user.sessionVersion ?? 0,
        };
      },
    }),
  ],
});
