import { Tabs } from 'expo-router';
import { color } from '@foundry/ui-native';

export default function AppTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: color.statusInfo,
        tabBarInactiveTintColor: color.textMuted,
        tabBarStyle: { backgroundColor: color.surfaceRaised, borderTopColor: color.border },
      }}
    >
      <Tabs.Screen name="desk" options={{ title: 'Desk' }} />
      <Tabs.Screen name="evidence" options={{ title: 'Evidence' }} />
      <Tabs.Screen name="approvals" options={{ title: 'Approvals' }} />
      <Tabs.Screen name="pack" options={{ title: 'Pack' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
      <Tabs.Screen name="sprint/[sprintId]" options={{ href: null, title: 'Sprint' }} />
      <Tabs.Screen name="artifact/[artifactId]" options={{ href: null, title: 'Artifact' }} />
    </Tabs>
  );
}
