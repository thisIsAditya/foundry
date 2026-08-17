import type { Sql } from './client.js';

export function jsonParam(sql: Sql, value: unknown) {
  return sql.json(JSON.parse(JSON.stringify(value)));
}
