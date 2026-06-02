import { sql } from "../../client";
import { type UserRow, rows } from "../../types";

/** DAL repository for the `users` table.
 *  Not yet wired to any module — users SQL is currently inside app.ts.
 *  This provides the typed boundary for when that refactor is scheduled. */
export class UserRepository {
  async findByEmail(email: string): Promise<UserRow | null> {
    const result = rows<UserRow>(await sql`
      SELECT id, email, name, image, password_hash, provider, email_verified, created_at
        FROM users
       WHERE email = ${email}
       LIMIT 1
    `);
    return result[0] ?? null;
  }

  async findById(id: string): Promise<UserRow | null> {
    const result = rows<UserRow>(await sql`
      SELECT id, email, name, image, password_hash, provider, email_verified, created_at
        FROM users
       WHERE id = ${id}
       LIMIT 1
    `);
    return result[0] ?? null;
  }

  async create(data: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    passwordHash: string | null;
    provider: string;
  }): Promise<UserRow> {
    const result = rows<UserRow>(await sql`
      INSERT INTO users (id, email, name, image, password_hash, provider)
      VALUES (${data.id}, ${data.email}, ${data.name}, ${data.image}, ${data.passwordHash}, ${data.provider})
      RETURNING id, email, name, image, password_hash, provider, email_verified, created_at
    `);
    if (result.length === 0) throw new Error("users insert returned no row");
    return result[0];
  }
}
