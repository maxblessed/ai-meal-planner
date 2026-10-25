import { PreferencesWizard } from '../components/PreferencesWizard';

/** First-run setup. The root navigator switches to the main app once preferences are saved. */
export function OnboardingScreen() {
  return <PreferencesWizard mode="onboarding" onSaved={() => undefined} />;
}
