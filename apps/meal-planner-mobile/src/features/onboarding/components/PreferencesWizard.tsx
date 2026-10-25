import { Ionicons } from '@expo/vector-icons';
import { FormProvider } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { type PreferencesFormValues } from '@/features/preferences';
import { colors, contentMaxWidth, spacing, touchTarget } from '@/theme';
import { STEPS, useOnboardingWizard } from '../hooks/useOnboardingWizard';
import { BudgetStep } from './steps/BudgetStep';
import { CountryStep } from './steps/CountryStep';
import { DietStep } from './steps/DietStep';
import { HouseholdStep } from './steps/HouseholdStep';
import { ReviewStep } from './steps/ReviewStep';

type PreferencesWizardProps = {
  mode: 'onboarding' | 'edit';
  initialValues?: PreferencesFormValues;
  /** Called after preferences are persisted. */
  onSaved: () => void;
  /** Called when the user backs out of the first screen (edit mode only). */
  onCancel?: () => void;
};

const STEP_INTRO: Partial<Record<(typeof STEPS)[number]['id'], string>> = {
  country: 'This sets your currency and how we show prices.',
  household: 'How many people are you planning meals for? We use this to scale portions.',
  review: 'Check everything looks right. You can change any of this later.',
};

export function PreferencesWizard({ mode, initialValues, onSaved, onCancel }: PreferencesWizardProps) {
  const wizard = useOnboardingWizard({ initialValues, startAtReview: mode === 'edit', onSaved });
  const { form, step, stepIndex, isReview, returnToReview } = wizard;

  const canGoBack = stepIndex > 0 && !(mode === 'edit' && isReview && !returnToReview);
  const showBack = canGoBack || (mode === 'edit' && onCancel !== undefined);
  const handleBack = () => {
    if (!wizard.goBack()) onCancel?.();
  };

  const finishLabel = mode === 'edit' ? 'Save changes' : 'Finish setup';

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerRow}>
              {showBack ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={canGoBack ? 'Back' : 'Cancel'}
                  onPress={handleBack}
                  style={styles.backButton}
                >
                  <Ionicons name={canGoBack ? 'chevron-back' : 'close'} size={26} color={colors.primary} />
                </Pressable>
              ) : (
                <View style={styles.backButton} />
              )}
              <AppText variant="label" tone="muted">
                {mode === 'edit' ? 'Edit preferences · ' : ''}Step {stepIndex + 1} of {STEPS.length}
              </AppText>
            </View>
            <ProgressBar progress={(stepIndex + 1) / STEPS.length} label={`Step ${stepIndex + 1} of ${STEPS.length}`} />
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.titleBlock}>
              <AppText variant="title" accessibilityRole="header">
                {step.title}
              </AppText>
              {STEP_INTRO[step.id] && <AppText tone="muted">{STEP_INTRO[step.id]}</AppText>}
            </View>

            <FormProvider {...form}>
              {step.id === 'country' && <CountryStep />}
              {step.id === 'household' && <HouseholdStep />}
              {step.id === 'diet' && <DietStep />}
              {step.id === 'budget' && <BudgetStep />}
              {step.id === 'review' && <ReviewStep onEdit={wizard.editStep} />}
            </FormProvider>

            {wizard.saveError && (
              <AppText tone="danger" accessibilityRole="alert">
                {wizard.saveError}
              </AppText>
            )}
          </ScrollView>

          <View style={styles.footer}>
            {isReview ? (
              <Button title={finishLabel} loading={form.formState.isSubmitting} onPress={wizard.submit} />
            ) : (
              <Button title={returnToReview ? 'Done' : 'Continue'} onPress={wizard.goNext} />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: { flex: 1, width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backButton: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
  body: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.xl },
  titleBlock: { gap: spacing.sm },
  footer: { padding: spacing.lg },
});
