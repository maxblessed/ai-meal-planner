import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { spacing } from '@/theme';
import { useAuth } from '../AuthProvider';
import { AuthForm } from '../components/AuthForm';

export function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  return (
    <Screen>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="display" accessibilityRole="header">
          Create your account
        </AppText>
        <AppText tone="muted">Your meal plans are saved to your account.</AppText>
      </View>
      <AuthForm mode="register" onSubmit={register} />
      <Button title="Already have an account? Sign in" variant="ghost" onPress={() => router.replace('/login')} />
    </Screen>
  );
}
