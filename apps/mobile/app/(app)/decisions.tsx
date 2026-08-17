import { useQuery } from '@tanstack/react-query';
import { ScrollView, Text, View } from 'react-native';

import { useActiveProject } from '../../lib/active-project';
import { scoreHeading } from '../../lib/labels';
import { screen } from '../../lib/styles';
import { useTRPC } from '../../lib/trpc';

export default function DecisionsScreen() {
  const { projectId } = useActiveProject();
  const trpc = useTRPC();
  const list = useQuery({
    ...trpc.decision.list.queryOptions({
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
  const history = useQuery({
    ...trpc.score.getHistory.queryOptions({
      projectId: projectId ?? '00000000-0000-4000-8000-000000000000',
      limit: 8,
    }),
    enabled: projectId !== null,
  });

  if (projectId === null) {
    return (
      <View style={screen.root}>
        <Text style={screen.lede}>Select a project in More first.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={screen.root}>
      <Text style={screen.title}>Decisions</Text>
      <Text style={screen.lede}>
        GO, PIVOT, and KILL sit next to score history so you can see why the plan changed.
      </Text>
      <View style={screen.card}>
        <Text style={screen.cardTitle}>
          {score.data === null || score.data === undefined
            ? 'Score pending'
            : `${String(Math.round(score.data.overall))} / 100`}
        </Text>
        {(score.data?.topActions ?? []).slice(0, 3).map((action) => (
          <Text key={action.action} style={screen.muted}>
            {scoreHeading(action.dimension)}: {action.action}
          </Text>
        ))}
        {(history.data ?? []).length === 0 ? null : (
          <Text style={screen.muted}>
            Trend:{' '}
            {(history.data ?? []).map((item) => String(Math.round(item.overall))).join(' → ')}
          </Text>
        )}
      </View>
      {list.isError ? <Text style={screen.alert}>{list.error.message}</Text> : null}
      {(list.data ?? []).length === 0 ? (
        <Text style={screen.muted}>No decisions recorded yet.</Text>
      ) : (
        (list.data ?? []).map((item) => (
          <View key={item.id} style={screen.card}>
            <Text style={screen.body}>{item.rationale ?? 'No reason was recorded.'}</Text>
            <Text style={screen.muted}>{JSON.stringify(item.chosen)}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}
