import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  DEFAULT_FORM_VALUES,
  preferencesFormSchema,
  toPreferences,
  usePreferences,
  type PreferencesFormValues,
} from '@/features/preferences';

export const STEPS = [
  { id: 'country', title: 'Where do you shop?', fields: ['countryCode'] },
  { id: 'household', title: "Who's eating?", fields: ['householdSize'] },
  { id: 'diet', title: 'Food preferences', fields: ['dietaryPreferences', 'allergies', 'dislikedIngredients'] },
  { id: 'budget', title: 'Weekly grocery budget', fields: ['weeklyBudget'] },
  { id: 'review', title: 'Review your setup', fields: [] },
] as const satisfies readonly { id: string; title: string; fields: readonly (keyof PreferencesFormValues)[] }[];

export type StepId = (typeof STEPS)[number]['id'];

const REVIEW_INDEX = STEPS.length - 1;

type Options = {
  initialValues?: PreferencesFormValues;
  /** Edit mode opens straight on the review step. */
  startAtReview?: boolean;
  onSaved: () => void;
};

export function useOnboardingWizard({ initialValues, startAtReview = false, onSaved }: Options) {
  const { savePreferences } = usePreferences();
  const form = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesFormSchema),
    defaultValues: initialValues ?? DEFAULT_FORM_VALUES,
    mode: 'onTouched',
  });
  const [stepIndex, setStepIndex] = useState(startAtReview ? REVIEW_INDEX : 0);
  // After jumping to a step from the review screen, Continue/Back return to review.
  const [returnToReview, setReturnToReview] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const step = STEPS[stepIndex];
  const isReview = stepIndex === REVIEW_INDEX;

  const goNext = async () => {
    if (!(await form.trigger([...step.fields]))) return;
    setStepIndex(returnToReview ? REVIEW_INDEX : stepIndex + 1);
    setReturnToReview(false);
  };

  /** Returns false when already at the start of the flow (caller decides what that means). */
  const goBack = () => {
    if (returnToReview) {
      setStepIndex(REVIEW_INDEX);
      setReturnToReview(false);
      return true;
    }
    if (stepIndex === 0 || (startAtReview && isReview)) return false;
    setStepIndex(stepIndex - 1);
    return true;
  };

  const editStep = (id: StepId) => {
    setStepIndex(STEPS.findIndex((s) => s.id === id));
    setReturnToReview(true);
  };

  const submit = form.handleSubmit(async (values) => {
    setSaveError(null);
    try {
      await savePreferences(toPreferences(values));
      onSaved();
    } catch {
      setSaveError("We couldn't save your preferences on this device. Please try again.");
    }
  });

  return { form, step, stepIndex, isReview, returnToReview, saveError, goNext, goBack, editStep, submit };
}
