import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ErrorState } from '@/components/ui/ErrorState';
import { AuthProvider, useAuth } from '@/features/auth';
import { PreferencesProvider, usePreferences } from '@/features/preferences';
import { colors } from '@/theme';

export default function RootLayout() {
  // One client per app instance. Queries retry once; mutations never retry automatically.
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PreferencesForCurrentUser />
      </AuthProvider>
    </QueryClientProvider>
  );
}

/** Preferences are stored per account, so they load only once we know who is signed in. */
function PreferencesForCurrentUser() {
  const { user } = useAuth();
  return (
    <PreferencesProvider userId={user?.id}>
      {/* expo-status-bar's `style` is a string, not a style object */}
      {/* eslint-disable-next-line react/style-prop-object */}
      <StatusBar style="dark" />
      <RootNavigator />
    </PreferencesProvider>
  );
}

function RootNavigator() {
  const auth = useAuth();
  const { status: preferencesStatus, preferences } = usePreferences();

  if (auth.status === 'unreachable') {
    return (
      <Screen>
        <ErrorState
          title="Can't reach the meal planner"
          message="We couldn't check your sign-in because the service isn't reachable. Check your connection and try again."
          onRetry={auth.retry}
        />
      </Screen>
    );
  }

  if (auth.status === 'restoring' || preferencesStatus === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const signedIn = auth.status === 'signedIn';
  const onboarded = preferences !== null;

  // Each guard lists the only screens reachable in that state; Expo Router redirects when it flips.
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="preferences" options={{ presentation: 'modal' }} />
        <Stack.Screen name="meal/[planId]/[mealId]" />
      </Stack.Protected>
    </Stack>
  );
}
