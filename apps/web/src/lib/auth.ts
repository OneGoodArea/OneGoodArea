import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { apiBaseUrl } from "@/lib/server/api-client";
import { mintBridgeToken } from "@/lib/server/bridge";

/* AR-339 (epic AR-335): the per-request ensureAuthTables() bootstrap
   was removed. The apps/api migrator owns DDL for users / verification
   / magic_link_tokens, so tables are guaranteed to exist at deploy
   time. No need to wastefully CREATE TABLE IF NOT EXISTS on every
   cold request. */

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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

        /* AR-646: magic-link consume moved to the API — single-use
           consumption, expiry and email_verified backfill all happen there
           atomically. Web just relays the token and mints the session from
           the returned user. */
        const res = await fetch(`${apiBaseUrl()}/auth/magic-link/consume`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token: credentials.token }),
        });
        if (!res.ok) return null;

        const data = await res.json();
        const user = data?.user;
        if (!user?.id) return null;

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
      if (account?.provider === "google") {
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
        if (user.id) {
          try {
            const res = await fetch(`${apiBaseUrl()}/auth/state`, {
              method: "GET",
              headers: { authorization: `Bearer ${(await mintBridgeToken(user.id))}` },
            });
            if (res.ok) {
              const data = await res.json();
              if (data?.userType) token.userType = data.userType;
            }
          } catch {
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      if (token.userType) {
        session.user.userType = token.userType as string;
      }
      return session;
    },
  },
});
