import * as Notifications from 'expo-notifications';

export async function registerPushToken(): Promise<string | null> {
  const permission = await Notifications.requestPermissionsAsync();
  if (permission.granted !== true) {
    return null;
  }
  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}
