import { tool, type Tool } from 'ai';
import { z } from 'zod';

export const academicSearchTool: Tool = tool({
  description:
    'Discover public academic papers relevant to a market, problem, or method. Read-only. Do not invent citations; return only structured hits.',
  inputSchema: z.object({
    query: z.string().min(3),
    yearFrom: z.number().int().optional(),
  }),
  execute: async (input) => ({
    query: input.query,
    papers: [] as { title: string; url: string; year: number | null; snippet: string }[],
  }),
});

export const marketReportSearchTool: Tool = tool({
  description:
    'Discover public market or industry reports. Read-only. Geography should match the project. Do not invent figures.',
  inputSchema: z.object({
    query: z.string().min(3),
    geography: z.string().min(1).optional(),
  }),
  execute: async (input) => ({
    query: input.query,
    geography: input.geography ?? null,
    reports: [] as { title: string; url: string; publisher: string; snippet: string }[],
  }),
});
