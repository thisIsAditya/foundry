import type { PoolSql } from './client.js';

/** Serializes truncates that share a database so concurrent test processes do not deadlock. */
const TEST_TRUNCATE_LOCK = 87_231_401;

export async function truncateAppTables(sql: PoolSql): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(${TEST_TRUNCATE_LOCK})`;
    await tx`update projects set current_pack_revision_id = null`;
    await tx`update artifacts set current_version_id = null`;
    await tx`
      truncate table
        tool_calls,
        tool_definitions,
        render_jobs,
        artifact_versions,
        artifacts,
        approval_requests,
        decisions,
        proposed_changes,
        metric_observations,
        metric_definitions,
        pack_sections,
        integration_connections,
        policies,
        wtp_events,
        experiments,
        unit_economics_models,
        offers,
        business_models,
        market_models,
        money_rules,
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
  });
}
