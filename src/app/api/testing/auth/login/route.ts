import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { sql } from "@/lib/db";
import { generateId } from "@/lib/id";
import { row, type UserRow } from "@/lib/db-types";
import { ensureUsersTable } from "@/lib/db-schema";
import { requireTestingRouteAccess } from "@/lib/runtime/testing/guards";

const SESSION_COOKIE = "authjs.session-token";

function getSessionSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Missing NEXTAUTH_SECRET");
  }
  return secret;
}

async function createSessionToken(user: UserRow): Promise<string> {
  return encode({
    token: {
      sub: user.id,
      userId: user.id,
      email: user.email,
      name: user.name ?? undefined,
      picture: user.image ?? undefined,
    },
    secret: getSessionSecret(),
    salt: SESSION_COOKIE,
  });
}

export async function POST(req: NextRequest) {
  const forbidden = requireTestingRouteAccess(req);
  if (forbidden) {
    return forbidden;
  }

  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : email.split("@")[0];

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  await ensureUsersTable();

  const existingRows = await sql`
    SELECT id, email, name, image, password_hash, provider, email_verified, created_at
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `;

  let user: UserRow;

  if (existingRows.length > 0) {
    user = row<UserRow>(existingRows[0]);
    await sql`
      UPDATE users
      SET name = COALESCE(${name}, name), email_verified = TRUE
      WHERE id = ${user.id}
    `;
  } else {
    const id = generateId("user");
    const createdRows = await sql`
      INSERT INTO users (id, email, name, provider, email_verified)
      VALUES (${id}, ${email}, ${name}, 'credentials', TRUE)
      RETURNING id, email, name, image, password_hash, provider, email_verified, created_at
    `;
    user = row<UserRow>(createdRows[0]);
  }

  const token = await createSessionToken(user);
  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
