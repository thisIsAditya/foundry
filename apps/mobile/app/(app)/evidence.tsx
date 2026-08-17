import { EvidenceLibraryFilters } from '@foundry/api-contracts';
import { color } from '@foundry/ui-native';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useActiveProject } from '../../lib/active-project';
import { listPendingDrafts } from '../../lib/offline-drafts';
import { screen } from '../../lib/styles';
import { useTRPC } from '../../lib/trpc';

export default function EvidenceScreen() {
  const { projectId } = useActiveProject();
  const [filter, setFilter] = useState<(typeof EvidenceLibraryFilters)[number] | undefined>();
  const [pending, setPending] = useState(0);
  const trpc = useTRPC();
  const library = useQuery({
    ...trpc.evidence.listLibrary.queryOptions({
      projectId: projectId ?? '00000000-0000-4000-8000-000000000000',
      ...(filter === undefined ? {} : { filter }),
    }),
    enabled: projectId !== null,
  });

  useEffect(() => {
    void listPendingDrafts().then((items) => setPending(items.length));
  }, []);

  if (projectId === null) {
    return (
      <View style={screen.root}>
        <Text style={screen.lede}>Select a project in More first.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={screen.root}>
      <Text style={screen.title}>Evidence</Text>
      <Text style={screen.lede}>
        Interviews, quotes, sources, findings, assumptions, and payment signals.
      </Text>
      {pending === 0 ? null : (
        <Text style={screen.muted}>{pending} local draft(s) waiting to sync.</Text>
      )}
      <View style={screen.row}>
        <Pressable onPress={() => setFilter(undefined)}>
          <Text
            style={
              filter === undefined ? { ...screen.badge, color: color.statusInfo } : screen.badge
            }
          >
            All
          </Text>
        </Pressable>
        {EvidenceLibraryFilters.map((item) => (
          <Pressable key={item} onPress={() => setFilter(item)}>
            <Text
              style={filter === item ? { ...screen.badge, color: color.statusInfo } : screen.badge}
            >
              {item.replaceAll('_', ' ')}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={screen.row}>
        <Link href="/(app)/capture/interview" style={{ color: color.statusInfo }}>
          Interview
        </Link>
        <Link href="/(app)/capture/wtp" style={{ color: color.statusInfo }}>
          Payment
        </Link>
        <Link href="/(app)/capture/observation" style={{ color: color.statusInfo }}>
          Observation
        </Link>
      </View>
      {library.isError ? <Text style={screen.alert}>{library.error.message}</Text> : null}
      {(library.data ?? []).map((item) => (
        <View key={`${item.kind}-${item.id}`} style={screen.card}>
          <Text style={screen.cardTitle}>{item.title}</Text>
          <Text style={screen.muted}>
            {item.kind.replaceAll('_', ' ')} · {item.detail}
          </Text>
          {item.stale ? <Text style={screen.muted}>Stale</Text> : null}
          {item.conflicting ? <Text style={screen.muted}>Conflicting</Text> : null}
        </View>
      ))}
    </ScrollView>
  );
}
