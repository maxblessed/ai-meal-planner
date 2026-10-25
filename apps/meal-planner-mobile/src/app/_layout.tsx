import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { PreferencesProvider, usePreferences } from '@/features/preferences';
import { colors } from '@/theme';

export default function RootLayout() {
  // One client per app instance. Queries retry once; mutations never retry automatically.
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));

  return (
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        {/* expo-status-bar's `style` is a string, not a style object */}
        {/* eslint-disable-next-line react/style-prop-object */}
        <StatusBar style="dark" />
        <RootNavigator />
      </PreferencesProvider>
    </QueryClientProvider>
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
        <Stack.Screen name="meal/[planId]/[mealId]" />
      </Stack.Protected>
    </Stack>
  );
}
