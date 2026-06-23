import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { sql } from "@/lib/db";
import {
  ensureUsersTable,
  ensureVerificationTable,
  ensureMagicLinkTokensTable,
} from "@/lib/db-schema";
import { row, UserRow, MagicLinkTokenRow } from "@/lib/db-types";
import { apiBaseUrl } from "@/lib/server/api-client";

let _authTablesReady = false;
async function ensureAuthTables() {
  if (_authTablesReady) return;
  await Promise.all([
    ensureUsersTable(),
    ensureVerificationTable(),
    ensureMagicLinkTokensTable(),
  ]);
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

        const email = credentials.email as string;
        const password = credentials.password as string;
        const action = credentials.action as string | undefined;

        // Registration path: call API register, then login
        if (action === "register") {
          const name = (credentials.name as string) || email.split("@")[0];
          const regRes = await fetch(`${apiBaseUrl()}/auth/register`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email, password, name }),
          });
          if (!regRes.ok) return null;
        }

        // Login via API (handles credential validation + PBKDF2 rehash)
        const res = await fetch(`${apiBaseUrl()}/auth/login`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) return null;
        return res.json();
      },
    }),
    /* AR-250 [AR-248-B] Magic-link sign-in provider. Consumes a token
       minted by POST /api/auth/magic-link/request. Same NextAuth
       Credentials provider machinery, different credential shape (just
       `token`), separate id ("magic-link") so the email+password
       provider isn't confused with this one client-side. The /auth/magic-link
       client page calls signIn("magic-link", { token, redirect: false }). */
    Credentials({
      id: "magic-link",
      name: "Magic Link",
      credentials: {
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.token || typeof credentials.token !== "string") {
          return null;
        }

        await ensureAuthTables();
        const token = credentials.token;

        const tokenRows = await sql`
          SELECT id, user_id, email, expires_at, used
          FROM magic_link_tokens
          WHERE token = ${token}
        `;
        if (tokenRows.length === 0) return null;

        const tokenRow = row<
          Pick<MagicLinkTokenRow, "id" | "user_id" | "email" | "expires_at" | "used">
        >(tokenRows[0]);
        if (tokenRow.used) return null;
        if (new Date(tokenRow.expires_at) < new Date()) return null;

        /* Single-use: mark consumed atomically before signing in.
           If a second click races, the second authorize call will
           see used=TRUE and return null. */
        await sql`
          UPDATE magic_link_tokens SET used = TRUE WHERE id = ${tokenRow.id}
        `;

        /* Clicking a magic link is strong proof of email ownership.
           Auto-verify the email if it wasn't already (saves the user
           a separate verification step — AR-248 §2 says "verify gates
           writes" so users still need verified email to write data,
           and this is the path that gets them there). */
        await sql`
          UPDATE users SET email_verified = TRUE
          WHERE id = ${tokenRow.user_id} AND email_verified = FALSE
        `;

        const userRows = await sql`
          SELECT id, email, name, image FROM users WHERE id = ${tokenRow.user_id}
        `;
        if (userRows.length === 0) return null;
        const user = row<Pick<UserRow, "id" | "email" | "name" | "image">>(userRows[0]);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/sign-in",
    newUser: "/dashboard",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isProtected = request.nextUrl.pathname.startsWith("/dashboard") ||
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
        const res = await fetch(`${apiBaseUrl()}/auth/oauth-callback`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            name: user.name,
            image: user.image,
            provider: account.provider,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          user.id = data.id;
        }
      }
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
