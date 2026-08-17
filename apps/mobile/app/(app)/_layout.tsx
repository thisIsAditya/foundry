import { color } from '@foundry/ui-native';
import { Tabs } from 'expo-router';

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
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="co-founder" options={{ title: 'Co-founder' }} />
      <Tabs.Screen name="work" options={{ title: 'Work' }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan' }} />
      <Tabs.Screen name="evidence" options={{ title: 'Evidence' }} />
      <Tabs.Screen name="more" options={{ href: null, title: 'More' }} />
      <Tabs.Screen name="settings" options={{ href: null, title: 'Settings' }} />
      <Tabs.Screen name="decisions" options={{ href: null, title: 'Decisions' }} />
      <Tabs.Screen name="sprint/[sprintId]" options={{ href: null, title: 'Job' }} />
      <Tabs.Screen name="artifact/[artifactId]" options={{ href: null, title: 'Artifact' }} />
      <Tabs.Screen name="task/[founderTaskId]" options={{ href: null, title: 'Task' }} />
      <Tabs.Screen name="capture/interview" options={{ href: null, title: 'Interview' }} />
      <Tabs.Screen name="capture/wtp" options={{ href: null, title: 'Payment signal' }} />
      <Tabs.Screen name="capture/observation" options={{ href: null, title: 'Observation' }} />
    </Tabs>
  );
}
