import { Screen } from '@/components/layout/Screen';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';

export function SavingsScreen() {
  return (
    <Screen>
      <AppText variant="display" accessibilityRole="header">
        Savings
      </AppText>
      <EmptyState
        icon="pricetag-outline"
        title="Price comparison is coming soon"
        description="We'll show how much you could save across supermarkets once price data is connected."
      />
    </Screen>
  );
}
