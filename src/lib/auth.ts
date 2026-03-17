import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { sql } from "@/lib/db";
import { trackEvent } from "@/lib/activity";
import { sendVerificationEmail } from "@/lib/email";
import { hashPassword, verifyPassword, generateToken } from "@/lib/crypto";
import { ensureUsersTable, ensureVerificationTable } from "@/lib/db-schema";
import { row, UserRow } from "@/lib/db-types";

let _authTablesReady = false;
async function ensureAuthTables() {
  if (_authTablesReady) return;
  await Promise.all([ensureUsersTable(), ensureVerificationTable()]);
  _authTablesReady = true;
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

        await ensureAuthTables();

        const email = credentials.email as string;
        const password = credentials.password as string;
        const action = credentials.action as string | undefined;

        if (action === "register") {
          // Sign up
          const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
          if (existing.length > 0) return null;

          const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          const name = (credentials.name as string) || email.split("@")[0];
          const hash = await hashPassword(password);

          await sql`
            INSERT INTO users (id, email, name, password_hash, provider, email_verified)
            VALUES (${id}, ${email}, ${name}, ${hash}, 'credentials', FALSE)
          `;

          // Send verification email (fire-and-forget)
          try {
            await ensureAuthTables();
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
        const signInRows = await sql`
          SELECT id, email, name, image, password_hash FROM users
          WHERE email = ${email} AND provider = 'credentials'
        `;
        if (signInRows.length === 0 || !signInRows[0].password_hash) return null;

        const foundUser = row<UserRow>(signInRows[0]);

        const { valid, needsRehash } = await verifyPassword(password, foundUser.password_hash!);
        if (!valid) return null;

        // Transparently upgrade legacy SHA-256 hashes to PBKDF2
        if (needsRehash) {
          const newHash = await hashPassword(password);
          sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${foundUser.id}`.catch(() => {});
        }

        return {
          id: foundUser.id,
          email: foundUser.email,
          name: foundUser.name,
          image: foundUser.image,
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
        await ensureAuthTables();

        const existing = await sql`SELECT id FROM users WHERE email = ${user.email}`;

        if (existing.length === 0) {
          const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          await sql`
            INSERT INTO users (id, email, name, image, provider, email_verified)
            VALUES (${id}, ${user.email}, ${user.name}, ${user.image}, ${account.provider}, TRUE)
          `;
          user.id = id;
        } else {
          const existingUser = row<Pick<UserRow, "id">>(existing[0]);
          user.id = existingUser.id;
          // Update name/image if changed
          await sql`
            UPDATE users SET name = ${user.name}, image = ${user.image}
            WHERE id = ${existingUser.id}
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
