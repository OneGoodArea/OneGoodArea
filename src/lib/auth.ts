import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { sql } from "@/lib/db";
import { trackEvent } from "@/lib/activity";
import { sendVerificationEmail } from "@/lib/email";

async function ensureUsersTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      image TEXT,
      password_hash TEXT,
      provider TEXT DEFAULT 'credentials',
      email_verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  // Add column if table already exists without it
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE
  `;
}

async function ensureVerificationTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        action: { label: "Action", type: "text" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await ensureUsersTable();

        const email = credentials.email as string;
        const password = credentials.password as string;
        const action = credentials.action as string | undefined;
        const hash = await hashPassword(password);

        if (action === "register") {
          // Sign up
          const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
          if (existing.length > 0) return null;

          const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          const name = (credentials.name as string) || email.split("@")[0];

          await sql`
            INSERT INTO users (id, email, name, password_hash, provider, email_verified)
            VALUES (${id}, ${email}, ${name}, ${hash}, 'credentials', FALSE)
          `;

          // Send verification email (fire-and-forget)
          try {
            await ensureVerificationTable();
            const token = generateToken();
            const tokenId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

            await sql`
              INSERT INTO email_verification_tokens (id, user_id, email, token, expires_at)
              VALUES (${tokenId}, ${id}, ${email}, ${token}, ${expiresAt})
            `;

            await sendVerificationEmail(email, token);
          } catch (e) {
            console.error("Failed to send verification email:", e);
          }

          return { id, email, name };
        }

        // Sign in
        const rows = await sql`
          SELECT id, email, name, image FROM users
          WHERE email = ${email} AND password_hash = ${hash}
        `;
        if (rows.length === 0) return null;

        return {
          id: rows[0].id as string,
          email: rows[0].email as string,
          name: rows[0].name as string | null,
          image: rows[0].image as string | null,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/sign-in",
    newUser: "/report",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isProtected = request.nextUrl.pathname.startsWith("/report") ||
        request.nextUrl.pathname.startsWith("/dashboard") ||
        request.nextUrl.pathname.startsWith("/compare") ||
        request.nextUrl.pathname.startsWith("/admin") ||
        request.nextUrl.pathname.startsWith("/settings");

      if (isProtected && !isLoggedIn) {
        const signInUrl = new URL("/sign-in", request.url);
        signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
        return Response.redirect(signInUrl);
      }
      return true;
    },
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "github") {
        await ensureUsersTable();

        const existing = await sql`SELECT id FROM users WHERE email = ${user.email}`;

        if (existing.length === 0) {
          const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          await sql`
            INSERT INTO users (id, email, name, image, provider, email_verified)
            VALUES (${id}, ${user.email}, ${user.name}, ${user.image}, ${account.provider}, TRUE)
          `;
          user.id = id;
        } else {
          user.id = existing[0].id as string;
          // Update name/image if changed
          await sql`
            UPDATE users SET name = ${user.name}, image = ${user.image}
            WHERE id = ${existing[0].id}
          `;
        }
      }
      trackEvent("auth.signin", user.id, { provider: account?.provider || "credentials" });
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
});
