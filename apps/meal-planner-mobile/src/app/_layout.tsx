import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

import { PreferencesProvider, usePreferences } from '@/features/preferences';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <PreferencesProvider>
      {/* expo-status-bar's `style` is a string, not a style object */}
      {/* eslint-disable-next-line react/style-prop-object */}
      <StatusBar style="dark" />
      <RootNavigator />
    </PreferencesProvider>
  );
}

function RootNavigator() {
  const { status, preferences } = usePreferences();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const onboarded = preferences !== null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="preferences" options={{ presentation: 'modal' }} />
      </Stack.Protected>
    </Stack>
  );
}
