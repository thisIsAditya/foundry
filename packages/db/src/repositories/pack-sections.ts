import {
  GtmSectionBodySchema,
  LaunchSectionBodySchema,
  LegalSectionBodySchema,
  MvbpSectionBodySchema,
  OrgCostSectionBodySchema,
  PackRevisionIdSchema,
  PackSectionIdSchema,
  PackSectionKeySchema,
  PackSectionSchema,
  type PackRevisionId,
  type PackSection,
  type PackSectionBody,
  type PackSectionKey,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { requireRow } from '../require-row.js';

const PackSectionRowSchema = z.object({
  id: PackSectionIdSchema,
  pack_revision_id: PackRevisionIdSchema,
  section: PackSectionKeySchema,
  body_json: z.unknown(),
  created_at: z.coerce.date(),
});

type PackSectionRow = z.infer<typeof PackSectionRowSchema>;

export function emptyPackSectionBody(section: PackSectionKey): PackSectionBody {
  switch (section) {
    case 'mvbp':
      return MvbpSectionBodySchema.parse({
        hypothesis: '',
        capability: '',
        featureCount: 0,
        outOfScope: [],
        killLines: [],
        founderAssertions: [],
      });
    case 'gtm':
      return GtmSectionBodySchema.parse({
        firstHundredPlan: '',
        channel: '',
        adsFirst: false,
        founderAssertions: [],
      });
    case 'org_cost':
      return OrgCostSectionBodySchema.parse({
        skills: [],
        monthlyBurn: '0',
        runwayMonths: '0',
        founderAssertions: [],
      });
    case 'legal':
      return LegalSectionBodySchema.parse({
        jurisdiction: 'IN',
        watermark: true,
        neverFiles: true,
        items: [],
        founderAssertions: [],
      });
    case 'launch':
      return LaunchSectionBodySchema.parse({
        checklist: [],
        log: [],
        founderAssertions: [],
      });
  }
}

function parseBody(section: PackSectionKey, body: unknown): PackSectionBody {
  switch (section) {
    case 'mvbp':
      return MvbpSectionBodySchema.parse(body);
    case 'gtm':
      return GtmSectionBodySchema.parse(body);
    case 'org_cost':
      return OrgCostSectionBodySchema.parse(body);
    case 'legal':
      return LegalSectionBodySchema.parse(body);
    case 'launch':
      return LaunchSectionBodySchema.parse(body);
  }
}

export function toPackSection(row: PackSectionRow): PackSection {
  return PackSectionSchema.parse({
    id: row.id,
    packRevisionId: row.pack_revision_id,
    section: row.section,
    body: parseBody(row.section, row.body_json),
    createdAt: row.created_at,
  });
}

export async function upsertPackSection(
  sql: Sql,
  input: { packRevisionId: PackRevisionId; section: PackSectionKey; body: PackSectionBody },
): Promise<PackSection> {
  const rows = await sql<PackSectionRow[]>`
    insert into pack_sections (pack_revision_id, section, body_json)
    values (
      ${input.packRevisionId},
      ${input.section},
      ${jsonParam(sql, input.body)}
    )
    on conflict (pack_revision_id, section)
    do update set body_json = excluded.body_json
    returning *
  `;
  return toPackSection(PackSectionRowSchema.parse(requireRow(rows, 'upsertPackSection')));
}

export async function getPackSection(
  sql: Sql,
  packRevisionId: PackRevisionId,
  section: PackSectionKey,
): Promise<PackSection | null> {
  const rows = await sql<PackSectionRow[]>`
    select * from pack_sections
    where pack_revision_id = ${packRevisionId} and section = ${section}
  `;
  const row = rows[0];
  return row === undefined ? null : toPackSection(PackSectionRowSchema.parse(row));
}

export async function listPackSections(
  sql: Sql,
  packRevisionId: PackRevisionId,
): Promise<PackSection[]> {
  const rows = await sql<PackSectionRow[]>`
    select * from pack_sections where pack_revision_id = ${packRevisionId} order by section
  `;
  return rows.map((row) => toPackSection(PackSectionRowSchema.parse(row)));
}
