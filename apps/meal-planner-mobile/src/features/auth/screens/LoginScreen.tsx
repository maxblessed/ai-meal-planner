import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { spacing } from '@/theme';
import { useAuth } from '../AuthProvider';
import { AuthForm } from '../components/AuthForm';

export function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  return (
    <Screen>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="display" accessibilityRole="header">
          Welcome back
        </AppText>
        <AppText tone="muted">Sign in to see your meal plans.</AppText>
      </View>
      <AuthForm mode="login" onSubmit={({ email, password }) => login({ email, password })} />
      <Button title="New here? Create an account" variant="ghost" onPress={() => router.replace('/register')} />
    </Screen>
  );
}
