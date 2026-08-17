import {
  BusinessModelIdSchema,
  MoneyAmountSchema,
  OfferIdSchema,
  OfferSchema,
  type Offer,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { requireRow } from '../require-row.js';

const OfferRowSchema = z.object({
  id: OfferIdSchema,
  business_model_id: BusinessModelIdSchema,
  promise: z.string(),
  package_description: z.string(),
  price_json: z.unknown().nullable(),
  created_at: z.coerce.date(),
});

type OfferRow = z.infer<typeof OfferRowSchema>;

export type InsertOffer = {
  businessModelId: z.infer<typeof BusinessModelIdSchema>;
  promise: string;
  packageDescription: string;
  price?: z.infer<typeof MoneyAmountSchema> | null;
};

export function toOffer(row: OfferRow): Offer {
  return OfferSchema.parse({
    id: row.id,
    businessModelId: row.business_model_id,
    promise: row.promise,
    packageDescription: row.package_description,
    price:
      row.price_json === null || row.price_json === undefined
        ? null
        : MoneyAmountSchema.parse(row.price_json),
    createdAt: row.created_at,
  });
}

function parseOffer(row: OfferRow): Offer {
  return toOffer(OfferRowSchema.parse(row));
}

export async function insertOffer(sql: Sql, input: InsertOffer): Promise<Offer> {
  const rows = await sql<OfferRow[]>`
    insert into offers (business_model_id, promise, package_description, price_json)
    values (
      ${input.businessModelId},
      ${input.promise},
      ${input.packageDescription},
      ${input.price === undefined || input.price === null ? null : jsonParam(sql, input.price)}
    )
    returning *
  `;
  return parseOffer(requireRow(rows, 'insertOffer'));
}

export async function listOffersByBusinessModelId(
  sql: Sql,
  businessModelId: z.infer<typeof BusinessModelIdSchema>,
): Promise<Offer[]> {
  const rows = await sql<OfferRow[]>`
    select * from offers where business_model_id = ${businessModelId} order by created_at asc
  `;
  return rows.map(parseOffer);
}
