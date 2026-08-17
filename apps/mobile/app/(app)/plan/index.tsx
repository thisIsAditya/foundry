import { businessModelSectionStatusPresentation, color } from '@foundry/ui-native';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { useActiveProject } from '../../../lib/active-project';
import { scoreHeading } from '../../../lib/labels';
import { screen } from '../../../lib/styles';
import { useTRPC } from '../../../lib/trpc';

export default function PlanIndexScreen() {
  const { projectId } = useActiveProject();
  const trpc = useTRPC();
  const sections = useQuery({
    ...trpc.pack.listBusinessModelSections.queryOptions({
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

  if (projectId === null) {
    return (
      <View style={screen.root}>
        <Text style={screen.lede}>Select a project in More first.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={screen.root}>
      <Text style={screen.title}>Plan</Text>
      <Text style={screen.lede}>
        Complete outline with scores. Open a section for evidence, assumptions, and accept/reject.
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
      </View>
      {(sections.data ?? []).map((section) => {
        const presentation = businessModelSectionStatusPresentation(section.status);
        return (
          <Link key={section.key} href={`/(app)/plan/${section.key}`} style={screen.card}>
            <Text style={{ color: presentation.hex, fontSize: 12 }}>
              {presentation.icon} {presentation.label}
            </Text>
            <Text style={screen.cardTitle}>{section.title}</Text>
            <Text style={screen.muted}>{section.nextAction}</Text>
          </Link>
        );
      })}
      {sections.isError ? <Text style={screen.alert}>{sections.error.message}</Text> : null}
      <Link href="/(app)/more" style={{ color: color.statusInfo }}>
        Decisions and settings
      </Link>
    </ScrollView>
  );
}
