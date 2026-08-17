import {
  MetricDefinitionIdSchema,
  MetricDefinitionSchema,
  MetricObservationIdSchema,
  MetricObservationSchema,
  ProjectIdSchema,
  type MetricDefinition,
  type MetricObservation,
  type ProjectId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { numericToString } from '../numeric.js';
import { requireRow } from '../require-row.js';

const MetricDefinitionRowSchema = z.object({
  id: MetricDefinitionIdSchema,
  project_id: ProjectIdSchema,
  name: z.string(),
  unit: z.string(),
  calculation_spec_json: z.unknown(),
  created_at: z.coerce.date(),
});

const MetricObservationRowSchema = z.object({
  id: MetricObservationIdSchema,
  metric_id: MetricDefinitionIdSchema,
  value: z.unknown(),
  observed_at: z.coerce.date(),
});

type MetricDefinitionRow = z.infer<typeof MetricDefinitionRowSchema>;
type MetricObservationRow = z.infer<typeof MetricObservationRowSchema>;

export type InsertMetricDefinition = {
  projectId: ProjectId;
  name: string;
  unit: string;
  calculationSpec: unknown;
};

export type InsertMetricObservation = {
  metricId: MetricDefinition['id'];
  value: string;
};

export function toMetricDefinition(row: MetricDefinitionRow): MetricDefinition {
  return MetricDefinitionSchema.parse({
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    unit: row.unit,
    calculationSpec: row.calculation_spec_json,
    createdAt: row.created_at,
  });
}

export function toMetricObservation(row: MetricObservationRow): MetricObservation {
  return MetricObservationSchema.parse({
    id: row.id,
    metricId: row.metric_id,
    value: numericToString(row.value),
    observedAt: row.observed_at,
  });
}

export async function insertMetricDefinition(
  sql: Sql,
  input: InsertMetricDefinition,
): Promise<MetricDefinition> {
  const rows = await sql<MetricDefinitionRow[]>`
    insert into metric_definitions (project_id, name, unit, calculation_spec_json)
    values (
      ${input.projectId},
      ${input.name},
      ${input.unit},
      ${jsonParam(sql, input.calculationSpec)}
    )
    returning *
  `;
  return toMetricDefinition(
    MetricDefinitionRowSchema.parse(requireRow(rows, 'insertMetricDefinition')),
  );
}

export async function listMetricDefinitionsByProjectId(
  sql: Sql,
  projectId: ProjectId,
): Promise<MetricDefinition[]> {
  const rows = await sql<MetricDefinitionRow[]>`
    select * from metric_definitions where project_id = ${projectId} order by created_at asc
  `;
  return rows.map((row) => toMetricDefinition(MetricDefinitionRowSchema.parse(row)));
}

export async function getMetricDefinitionById(
  sql: Sql,
  id: MetricDefinition['id'],
): Promise<MetricDefinition | null> {
  const rows = await sql<MetricDefinitionRow[]>`
    select * from metric_definitions where id = ${id}
  `;
  const row = rows[0];
  return row === undefined ? null : toMetricDefinition(MetricDefinitionRowSchema.parse(row));
}

export async function insertMetricObservation(
  sql: Sql,
  input: InsertMetricObservation,
): Promise<MetricObservation> {
  const rows = await sql<MetricObservationRow[]>`
    insert into metric_observations (metric_id, value)
    values (${input.metricId}, ${input.value})
    returning *
  `;
  return toMetricObservation(
    MetricObservationRowSchema.parse(requireRow(rows, 'insertMetricObservation')),
  );
}

export async function listMetricObservationsByProjectId(
  sql: Sql,
  projectId: ProjectId,
): Promise<MetricObservation[]> {
  const rows = await sql<MetricObservationRow[]>`
    select o.*
    from metric_observations o
    join metric_definitions d on d.id = o.metric_id
    where d.project_id = ${projectId}
    order by o.observed_at asc
  `;
  return rows.map((row) => toMetricObservation(MetricObservationRowSchema.parse(row)));
}
