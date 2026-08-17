import { color } from '@foundry/ui-native';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useSession } from '../lib/auth';

export default function Index() {
  const session = useSession();
  if (session.isPending) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: color.surface,
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }
  if (session.data === null) {
    return <Redirect href="/(auth)/sign-in" />;
  }
  return <Redirect href="/(app)/home" />;
}
