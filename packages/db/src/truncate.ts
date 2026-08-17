import type { PoolSql } from './client.js';

export async function truncateAppTables(sql: PoolSql): Promise<void> {
  await sql`update projects set current_pack_revision_id = null`;
  await sql`
    truncate table
      usage_records,
      agent_runs,
      sprint_progress_events,
      gates,
      sprints,
      quotes,
      interviews,
      dmus,
      beachheads,
      pack_revisions,
      user_mcp_servers,
      provider_connections,
      content_blocks,
      documents,
      source_snapshots,
      sources,
      domain_events,
      notification_endpoints,
      project_memberships,
      projects,
      workspace_memberships,
      workspaces,
      api_keys,
      verifications,
      accounts,
      sessions,
      users
    cascade
  `;
}
