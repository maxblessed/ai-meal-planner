import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError, type MealPlan } from '@ai-meal-planner/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { PreferencesProvider, usePreferences } from '@/features/preferences';
import { getApiClient } from '@/features/auth/api/apiClient';
import { MealPlanScreen } from './MealPlanScreen';
import { MealDetailScreen } from './MealDetailScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/features/auth/api/apiClient');

const mockPush = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

const preferences = {
  countryCode: 'IE', householdSize: 2, dietaryPreferences: [], allergies: [], dislikedIngredients: [], weeklyBudget: 80,
};

const meal = (id: string, title: string, mealType: 'breakfast' | 'lunch' | 'dinner' = 'dinner') => ({
  id, mealType, title, description: `${title} description`, prepTimeMinutes: 10, cookTimeMinutes: 20, servings: 2,
  ingredients: ['Onion', 'Carrot', 'Rice', 'Beans', 'Spinach'].map((name) => ({ name, quantity: 1, unit: 'piece', category: 'produce' })),
  instructions: ['Chop.', 'Cook.'], dietaryTags: [],
});

const plan: MealPlan = {
  id: 'a'.repeat(24), startDate: '2026-03-30', endDate: '2026-03-30', currencyCode: 'EUR', ...preferences,
  days: [{ date: '2026-03-30', meals: [meal('m1', 'Bean chilli')] }],
  generation: { status: 'completed', source: 'development-sample', generatorName: 'Dev', generatedAt: '2026-03-30T10:00:00.000Z' },
  createdAt: '2026-03-30T10:00:00.000Z',
} as MealPlan;

const api = { mealPlans: { list: jest.fn(), get: jest.fn(), create: jest.fn(), replaceMeal: jest.fn() } };

/** Mirrors the root layout, which only renders screens once stored preferences have loaded. */
function ReadyGate({ children }: { children: React.ReactNode }) {
  return usePreferences().status === 'ready' ? children : null;
}

function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
  return render(
    <QueryClientProvider client={client}>
      <PreferencesProvider userId="user-1">
        <ReadyGate>{ui}</ReadyGate>
      </PreferencesProvider>
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockParams = {};
  (getApiClient as jest.Mock).mockReturnValue(api);
  await AsyncStorage.clear();
  await AsyncStorage.setItem('mealplanner.userPreferences.user-1', JSON.stringify({ version: 1, preferences }));
});

describe('MealPlanScreen', () => {
  it('shows a loading state, then the empty state with a generate button', async () => {
    let resolveList: (plans: MealPlan[]) => void = () => undefined;
    api.mealPlans.list.mockReturnValue(new Promise<MealPlan[]>((resolve) => (resolveList = resolve)));
    renderWithProviders(<MealPlanScreen />);

    expect(await screen.findByLabelText('Loading your meal plan…')).toBeTruthy();
    resolveList([]);
    expect(await screen.findByText('No meal plan yet')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Generate a 7-day sample plan' })).toBeTruthy();
  });

  it('generates a plan from saved preferences and shows it grouped by day with meal cards', async () => {
    api.mealPlans.list.mockResolvedValueOnce([]).mockResolvedValue([plan]);
    api.mealPlans.create.mockResolvedValue(plan);
    renderWithProviders(<MealPlanScreen />);

    fireEvent.press(await screen.findByRole('button', { name: 'Generate a 7-day sample plan' }));

    expect(await screen.findByText('Monday 30 March')).toBeTruthy();
    expect(api.mealPlans.create).toHaveBeenCalledWith(expect.objectContaining({ ...preferences, days: 7 }));
    expect(screen.getByText('Bean chilli')).toBeTruthy();
    expect(screen.getByText('30 min')).toBeTruthy();
    expect(screen.getByText('Serves 2')).toBeTruthy();
    expect(screen.getByText('Onion, Carrot, Rice, Beans +1 more')).toBeTruthy();
    expect(screen.getByText('Sample plan')).toBeTruthy();

    fireEvent.press(screen.getByLabelText(/Dinner: Bean chilli/));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/meal/[planId]/[mealId]', params: { planId: plan.id, mealId: 'm1' } });
  });

  it('shows an error with retry when the plan cannot be loaded, and recovers', async () => {
    api.mealPlans.list
      .mockRejectedValueOnce(new ApiError('NETWORK_ERROR', "We couldn't reach the meal planner service."))
      .mockResolvedValue([plan]);
    renderWithProviders(<MealPlanScreen />);

    expect(await screen.findByText("We couldn't reach the meal planner service.")).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Bean chilli')).toBeTruthy();
  });

  it('shows the API message when generation fails and offers a retry', async () => {
    api.mealPlans.list.mockResolvedValue([]);
    api.mealPlans.create.mockRejectedValueOnce(new ApiError('UNSATISFIABLE_PREFERENCES', 'No dinner matches your preferences.', 422));
    renderWithProviders(<MealPlanScreen />);

    fireEvent.press(await screen.findByRole('button', { name: 'Generate a 7-day sample plan' }));
    expect(await screen.findByText('No dinner matches your preferences.')).toBeTruthy();
    expect(screen.getByText("Couldn't create your plan")).toBeTruthy();
  });
});

describe('MealDetailScreen', () => {
  beforeEach(() => {
    mockParams = { planId: plan.id, mealId: 'm1' };
    api.mealPlans.get.mockResolvedValue(plan);
  });

  it('shows ingredients and method, and replaces the meal', async () => {
    const replaced = { ...plan, days: [{ date: '2026-03-30', meals: [meal('m1', 'Mushroom risotto')] }] } as MealPlan;
    api.mealPlans.replaceMeal.mockResolvedValue(replaced);
    renderWithProviders(<MealDetailScreen />);

    expect(await screen.findByText('Bean chilli')).toBeTruthy();
    expect(screen.getByText('Ingredients')).toBeTruthy();
    expect(screen.getByText('Chop.')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Replace this meal' }));
    expect(await screen.findByText('Mushroom risotto')).toBeTruthy();
    expect(api.mealPlans.replaceMeal).toHaveBeenCalledWith(plan.id, 'm1');
  });

  it('shows an error and keeps the current meal when replacing fails', async () => {
    api.mealPlans.replaceMeal.mockRejectedValue(new ApiError('NO_ALTERNATIVE_MEAL', 'There is no other dinner that fits.', 422));
    renderWithProviders(<MealDetailScreen />);

    fireEvent.press(await screen.findByRole('button', { name: 'Replace this meal' }));
    await waitFor(() => expect(screen.getByText('There is no other dinner that fits.')).toBeTruthy());
    expect(screen.getByText('Bean chilli')).toBeTruthy();
  });
});
