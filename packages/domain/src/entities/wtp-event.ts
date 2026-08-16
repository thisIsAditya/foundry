import { z } from 'zod';

import { ExperimentIdSchema, OfferIdSchema, WtpEventIdSchema } from '../ids.js';
import { WtpInstrumentSchema, WtpParticipantClassSchema } from '../status/evidence-status.js';
import {
  DecimalStringSchema,
  InstantSchema,
  IsoCurrencySchema,
} from '../value-objects/primitives.js';

export const WtpEventSchema = z.object({
  id: WtpEventIdSchema,
  experimentId: ExperimentIdSchema.nullable().default(null),
  offerId: OfferIdSchema.nullable().default(null),
  participantClass: WtpParticipantClassSchema,
  instrument: WtpInstrumentSchema,
  amount: DecimalStringSchema.nullable().default(null),
  currency: IsoCurrencySchema.nullable().default(null),
  occurredAt: InstantSchema,
});
export type WtpEvent = z.infer<typeof WtpEventSchema>;
