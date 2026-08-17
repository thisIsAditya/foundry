import { useQuery } from '@tanstack/react-query';
import { ScrollView, Text, View } from 'react-native';

import { useActiveProject } from '../../lib/active-project';
import { screen } from '../../lib/styles';
import { useTRPC } from '../../lib/trpc';

export default function SettingsScreen() {
  const { projectId, workspaceId } = useActiveProject();
  const trpc = useTRPC();
  const connections = useQuery({
    ...trpc.provider.listConnections.queryOptions({
      workspaceId: workspaceId ?? '00000000-0000-4000-8000-000000000000',
    }),
    enabled: workspaceId !== null,
  });
  const members = useQuery({
    ...trpc.member.list.queryOptions({
      workspaceId: workspaceId ?? '00000000-0000-4000-8000-000000000000',
    }),
    enabled: workspaceId !== null,
  });
  const preferences = useQuery({
    ...trpc.conversation.listPreferences.queryOptions({
      projectId: projectId ?? '00000000-0000-4000-8000-000000000000',
    }),
    enabled: projectId !== null,
  });
  const integrations = useQuery({
    ...trpc.integration.list.queryOptions({
      workspaceId: workspaceId ?? '00000000-0000-4000-8000-000000000000',
    }),
    enabled: workspaceId !== null,
  });

  if (projectId === null || workspaceId === null) {
    return (
      <View style={screen.root}>
        <Text style={screen.lede}>Select a project in More first.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={screen.root}>
      <Text style={screen.title}>Settings</Text>
      <Text style={screen.lede}>
        Providers, members, preferences, and draft-only integrations. Nothing here can send, charge,
        or file.
      </Text>
      <View style={screen.card}>
        <Text style={screen.cardTitle}>Providers</Text>
        {connections.isError ? <Text style={screen.alert}>{connections.error.message}</Text> : null}
        {(connections.data ?? []).length === 0 ? (
          <Text style={screen.muted}>No provider connections yet.</Text>
        ) : (
          (connections.data ?? []).map((item) => (
            <Text key={item.id} style={screen.body}>
              {item.providerFamily} · {item.healthStatus} · {item.authMode}
            </Text>
          ))
        )}
      </View>
      <View style={screen.card}>
        <Text style={screen.cardTitle}>Members</Text>
        {(members.data ?? []).map((member) => (
          <Text key={member.id} style={screen.body}>
            {member.userId} · {member.role}
          </Text>
        ))}
      </View>
      <View style={screen.card}>
        <Text style={screen.cardTitle}>Project preferences</Text>
        {(preferences.data ?? []).length === 0 ? (
          <Text style={screen.muted}>The co-founder has not inferred any preferences yet.</Text>
        ) : (
          (preferences.data ?? []).map((item) => (
            <Text key={item.id} style={screen.body}>
              {item.key}: {String(item.value)} ·{' '}
              {item.founderConfirmed ? 'Confirmed' : 'Unconfirmed'}
            </Text>
          ))
        )}
      </View>
      <View style={screen.card}>
        <Text style={screen.cardTitle}>Draft-only integrations</Text>
        {(integrations.data ?? []).length === 0 ? (
          <Text style={screen.muted}>None connected.</Text>
        ) : (
          (integrations.data ?? []).map((item) => (
            <Text key={item.id} style={screen.body}>
              {item.provider} · {item.connected ? 'Connected (draft-only)' : 'Revoked'}
            </Text>
          ))
        )}
      </View>
    </ScrollView>
  );
}
