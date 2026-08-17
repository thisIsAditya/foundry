import { ScoreDimensions } from '@foundry/domain';
import { color } from '@foundry/ui-native';
import { useQuery } from '@tanstack/react-query';
import { Link, router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useActiveProject } from '../../lib/active-project';
import { scoreHeading } from '../../lib/labels';
import { screen } from '../../lib/styles';
import { useTRPC } from '../../lib/trpc';

export default function HomeScreen() {
  const { projectId, isLoading } = useActiveProject();
  const trpc = useTRPC();
  const desk = useQuery({
    ...trpc.project.getDeskSummary.queryOptions({
      projectId: projectId ?? '00000000-0000-4000-8000-000000000000',
    }),
    enabled: projectId !== null,
  });
  const score = useQuery({
    ...trpc.score.getCurrent.queryOptions({
      projectId: projectId ?? '00000000-0000-4000-8000-000000000000',
    }),
    enabled: projectId !== null,
  });
  const jobs = useQuery({
    ...trpc.job.list.queryOptions({
      projectId: projectId ?? '00000000-0000-4000-8000-000000000000',
      view: 'running',
    }),
    enabled: projectId !== null,
  });
  const tasks = useQuery({
    ...trpc.founderTask.list.queryOptions({
      projectId: projectId ?? '00000000-0000-4000-8000-000000000000',
      status: 'active',
    }),
    enabled: projectId !== null,
  });
  const research = useQuery({
    ...trpc.job.list.queryOptions({
      projectId: projectId ?? '00000000-0000-4000-8000-000000000000',
      view: 'waiting_for_research',
    }),
    enabled: projectId !== null,
  });
  const history = useQuery({
    ...trpc.score.getHistory.queryOptions({
      projectId: projectId ?? '00000000-0000-4000-8000-000000000000',
      limit: 8,
    }),
    enabled: projectId !== null,
  });
  const revisions = useQuery({
    ...trpc.pack.listRevisions.queryOptions({
      projectId: projectId ?? '00000000-0000-4000-8000-000000000000',
    }),
    enabled: projectId !== null,
  });

  if (isLoading) {
    return (
      <View style={screen.root}>
        <Text style={screen.muted}>Loading your project…</Text>
      </View>
    );
  }
  if (projectId === null) {
    return (
      <View style={screen.root}>
        <Text style={screen.title}>Home</Text>
        <Text style={screen.lede}>Select a project in More after you sign in.</Text>
        <Pressable style={screen.button} onPress={() => router.push('/(app)/more')}>
          <Text style={screen.buttonLabel}>Open More</Text>
        </Pressable>
      </View>
    );
  }
  if (desk.isError) {
    return (
      <View style={screen.root}>
        <Text style={screen.alert}>{desk.error.message}</Text>
      </View>
    );
  }

  const overview = desk.data?.overview;
  const dimensions = overview?.dimensions;
  const ranked = ScoreDimensions.map((dimension) => ({
    dimension,
    raw: dimensions?.[dimension]?.raw ?? 0,
  })).sort((a, b) => b.raw - a.raw);
  const strongest = ranked[0];
  const weakest = ranked[ranked.length - 1];
  const running = jobs.data?.[0];
  const task = tasks.data?.[0];
  const proposal = research.data?.find(
    (job) => job.jobKind === 'research' && job.status === 'proposed',
  );
  const trend = (history.data ?? []).map((item) => Math.round(item.overall));
  const latestRevision = revisions.data?.[0];

  return (
    <ScrollView contentContainerStyle={screen.root}>
      <Text style={screen.title}>{desk.data?.project.name ?? 'Home'}</Text>
      <Text style={screen.lede}>
        {overview?.latestCofounderMessage?.text ??
          'Your idea is becoming a complete, labeled draft. Missing data is unknown, not a pass.'}
      </Text>
      <View style={screen.card}>
        <Text style={screen.muted}>How solid is it right now?</Text>
        <Text style={screen.title}>
          {overview?.overallScore === null || overview?.overallScore === undefined
            ? 'Score pending'
            : `${String(Math.round(overview.overallScore))} / 100`}
        </Text>
        {strongest === undefined ? null : (
          <Text style={screen.muted}>Strongest: {scoreHeading(strongest.dimension)}</Text>
        )}
        {weakest === undefined ? null : (
          <Text style={screen.muted}>Weakest: {scoreHeading(weakest.dimension)}</Text>
        )}
        {trend.length === 0 ? null : <Text style={screen.muted}>Trend: {trend.join(' → ')}</Text>}
      </View>
      <View style={screen.card}>
        <Text style={screen.cardTitle}>What is AI doing?</Text>
        <Text style={screen.body}>{running?.objective ?? 'Nothing running right now.'}</Text>
      </View>
      <View style={screen.card}>
        <Text style={screen.cardTitle}>What should you do next?</Text>
        <Text style={screen.body}>
          {task?.title ?? score.data?.topActions[0]?.action ?? desk.data?.nextAction}
        </Text>
        {proposal === undefined ? null : (
          <Text style={screen.muted}>Research waiting: {proposal.objective}</Text>
        )}
        {latestRevision === undefined ? null : (
          <Text style={screen.muted}>
            Latest plan change: revision {latestRevision.revisionNumber} ({latestRevision.status})
          </Text>
        )}
      </View>
      <View style={screen.row}>
        <Link href="/(app)/co-founder" style={{ color: color.statusInfo, fontWeight: '600' }}>
          Chat
        </Link>
        <Link
          href="/(app)/capture/interview"
          style={{ color: color.statusInfo, fontWeight: '600' }}
        >
          Capture
        </Link>
        <Link href="/(app)/plan" style={{ color: color.statusInfo, fontWeight: '600' }}>
          Review
        </Link>
        <Link href="/(app)/work" style={{ color: color.statusInfo, fontWeight: '600' }}>
          Work
        </Link>
        <Link href="/(app)/more" style={{ color: color.statusInfo, fontWeight: '600' }}>
          More
        </Link>
      </View>
    </ScrollView>
  );
}
