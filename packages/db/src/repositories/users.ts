import { UserSchema, type PlatformRole, type User, type UserId } from '@foundry/domain';

import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

type UserRow = {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  image: string | null;
  role: string;
  timezone: string;
  locale: string;
  created_at: Date;
  updated_at: Date;
};

export type InsertUser = {
  name: string;
  email: string;
  emailVerified?: boolean;
  image?: string | null;
  role?: PlatformRole;
  timezone?: string;
  locale?: string;
};

export function toUser(row: UserRow): User {
  return UserSchema.parse({
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.email_verified,
    image: row.image,
    role: row.role,
    timezone: row.timezone,
    locale: row.locale,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export async function insertUser(sql: Sql, input: InsertUser): Promise<User> {
  const rows = await sql<UserRow[]>`
    insert into users (
      name,
      email,
      email_verified,
      image,
      role,
      timezone,
      locale
    )
    values (
      ${input.name},
      ${input.email},
      ${input.emailVerified ?? false},
      ${input.image ?? null},
      ${input.role ?? 'founder'},
      ${input.timezone ?? 'UTC'},
      ${input.locale ?? 'en-IN'}
    )
    returning *
  `;
  return toUser(requireRow(rows, 'insertUser'));
}

export async function getUserById(sql: Sql, id: UserId): Promise<User | null> {
  const rows = await sql<UserRow[]>`
    select * from users where id = ${id}
  `;
  const row = rows[0];
  return row === undefined ? null : toUser(row);
}
