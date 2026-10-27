import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError, loginRequestSchema, registerRequestSchema } from '@ai-meal-planner/shared';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { spacing } from '@/theme';

type Mode = 'login' | 'register';

type Values = { email: string; password: string; displayName?: string };

type AuthFormProps = {
  mode: Mode;
  onSubmit: (values: Values) => Promise<void>;
};

/** Sign-in / sign-up form. Server errors are shown in plain language, never raw responses. */
export function AuthForm({ mode, onSubmit }: AuthFormProps) {
  const isRegister = mode === 'register';
  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting, errors },
  } = useForm<Values>({
    resolver: zodResolver(isRegister ? registerRequestSchema : loginRequestSchema) as Resolver<Values>,
    defaultValues: { email: '', password: '', displayName: '' },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit({ ...values, displayName: values.displayName?.trim() || undefined });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'EMAIL_ALREADY_REGISTERED') {
        setError('email', { message: error.message });
      } else if (error instanceof ApiError && error.code === 'VALIDATION_ERROR') {
        setError('root', { message: 'Please check the details you entered and try again.' });
      } else {
        setError('root', { message: error instanceof Error ? error.message : 'Something went wrong. Please try again.' });
      }
    }
  });

  return (
    <View style={styles.form}>
      {isRegister && (
        <Controller
          control={control}
          name="displayName"
          render={({ field, fieldState }) => (
            <TextField
              label="Name (optional)"
              autoComplete="name"
              textContentType="name"
              autoCapitalize="words"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
      )}
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <TextField
            label="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <TextField
            label="Password"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            textContentType={isRegister ? 'newPassword' : 'password'}
            hint={isRegister ? 'At least 8 characters.' : undefined}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            onSubmitEditing={submit}
            error={fieldState.error?.message}
          />
        )}
      />
      {errors.root?.message && (
        <AppText tone="danger" accessibilityRole="alert">
          {errors.root.message}
        </AppText>
      )}
      <Button title={isRegister ? 'Create account' : 'Sign in'} loading={isSubmitting} onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
});
