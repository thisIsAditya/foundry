import { color } from '@foundry/ui-native';
import { Link, router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { signOut } from '../../lib/auth';
import { useActiveProject } from '../../lib/active-project';
import { screen } from '../../lib/styles';

export default function MoreScreen() {
  const {
    projectId,
    workspaceId,
    workspaces,
    projects,
    selectProject,
    selectWorkspace,
    isLoading,
  } = useActiveProject();

  return (
    <ScrollView contentContainerStyle={screen.root}>
      <Text style={screen.title}>More</Text>
      <Text style={screen.lede}>Switch project, open decisions, or sign out.</Text>
      {isLoading ? <Text style={screen.muted}>Loading workspaces…</Text> : null}
      {workspaces.map((workspace) => (
        <View key={workspace.id} style={screen.card}>
          <Text style={screen.cardTitle}>{workspace.name}</Text>
          {workspace.id === workspaceId ? (
            projects.map((project) => (
              <Pressable
                key={project.id}
                onPress={() => void selectProject(project.id, workspace.id)}
              >
                <Text style={project.id === projectId ? { color: color.statusInfo } : screen.body}>
                  {project.id === projectId ? '● ' : '○ '}
                  {project.name}
                </Text>
              </Pressable>
            ))
          ) : (
            <Pressable onPress={() => void selectWorkspace(workspace.id)}>
              <Text style={screen.muted}>Use this workspace</Text>
            </Pressable>
          )}
        </View>
      ))}
      <Link href="/(app)/decisions" style={{ color: color.statusInfo }}>
        Decisions
      </Link>
      <Link href="/(app)/settings" style={{ color: color.statusInfo }}>
        Settings
      </Link>
      <Pressable
        style={screen.secondary}
        onPress={() => {
          void signOut().then(() => router.replace('/(auth)/sign-in'));
        }}
      >
        <Text style={screen.secondaryLabel}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}
