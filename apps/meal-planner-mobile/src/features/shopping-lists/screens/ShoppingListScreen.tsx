import { Screen } from '@/components/layout/Screen';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';

export function ShoppingListScreen() {
  return (
    <Screen>
      <AppText variant="display" accessibilityRole="header">
        Shopping list
      </AppText>
      <EmptyState
        icon="cart-outline"
        title="Nothing to shop for yet"
        description="Your shopping list will be built from your meal plan once meal planning is available."
      />
    </Screen>
  );
}
