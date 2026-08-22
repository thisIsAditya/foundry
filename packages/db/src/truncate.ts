import type { PoolSql } from './client.js';

/** Serializes truncates that share a database so concurrent test processes do not deadlock. */
const TEST_TRUNCATE_LOCK = 87_231_401;

export async function truncateAppTables(sql: PoolSql): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(${TEST_TRUNCATE_LOCK})`;
    await tx`update projects set current_pack_revision_id = null`;
    await tx`update artifacts set current_version_id = null`;
    await tx`update journeys set accepted_record_version_id = null`;
    await tx`update journey_stage_states set latest_record_version_id = null`;
    await tx`update record_items set current_version_id = null`;
    await tx`update record_item_staleness set resolved_by_version_id = null`;
    await tx`update activity_events set journey_id = null, step_id = null, proposal_id = null, version_id = null`;
    await tx`
      truncate table
        capability_invocations,
        capability_tokens,
        interview_import_candidates,
        interview_import_batches,
        project_memory_entries,
        record_support_links,
        cofounder_operations,
        proposal_changes_v4,
        proposals_v4,
        record_item_staleness,
        record_item_relations,
        record_items,
        business_record_versions,
        journey_transitions,
        journey_steps,
        journey_stage_states,
        activity_events,
        command_receipts,
        command_outbox,
        journeys,
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
        plan_scores,
        evidence_item_citations,
        evidence_items,
        citations,
        research_findings,
        founder_tasks,
        conversation_summaries,
        conversation_messages,
        founder_preferences,
        wedges,
        competitors,
        alternatives,
        personas,
        assumptions,
        problems,
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
