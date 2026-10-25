import { useRouter } from 'expo-router';

import { toFormValues, useRequiredPreferences } from '@/features/preferences';
import { PreferencesWizard } from '../components/PreferencesWizard';

export function EditPreferencesScreen() {
  const router = useRouter();
  const preferences = useRequiredPreferences();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return <PreferencesWizard mode="edit" initialValues={toFormValues(preferences)} onSaved={close} onCancel={close} />;
}
