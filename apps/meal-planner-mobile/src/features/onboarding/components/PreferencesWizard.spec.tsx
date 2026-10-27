import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { PreferencesProvider } from '@/features/preferences';
import { PreferencesWizard } from './PreferencesWizard';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

describe('PreferencesWizard (onboarding)', () => {
  beforeEach(() => AsyncStorage.clear());

  it('walks through every step, validates the budget, and persists the profile', async () => {
    const onSaved = jest.fn();
    render(
      <PreferencesProvider userId="user-1">
        <PreferencesWizard mode="onboarding" onSaved={onSaved} />
      </PreferencesProvider>,
    );

    // Step 1: country → GB switches currency
    fireEvent.press(await screen.findByRole('radio', { name: 'United Kingdom, GBP' }));
    press('Continue');

    // Step 2: household
    await screen.findByText("Who's eating?");
    press('Increase household size');
    press('Increase household size');
    press('Continue');

    // Step 3: diet, allergies, dislikes
    await screen.findByText('Food preferences');
    fireEvent.press(screen.getByRole('checkbox', { name: 'Vegetarian' }));
    fireEvent.press(screen.getByRole('checkbox', { name: 'Peanuts' }));
    press('Continue');

    // Step 4: invalid budget is blocked, valid one passes with the GBP symbol
    await screen.findByText('Weekly grocery budget');
    expect(screen.getByText('£')).toBeTruthy();
    press('Continue');
    await screen.findByText('Enter an amount above 0, like 85 or 85.50');
    fireEvent.changeText(screen.getByLabelText('Weekly budget (GBP)'), '85.50');
    press('Continue');

    // Step 5: review + finish
    await screen.findByText('Review your setup');
    expect(screen.getByText('United Kingdom · GBP (£)')).toBeTruthy();
    expect(screen.getByText('3 people')).toBeTruthy();
    expect(screen.getByText('£85.50 per week')).toBeTruthy();
    press('Finish setup');

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const stored = JSON.parse((await AsyncStorage.getItem('mealplanner.userPreferences.user-1')) as string);
    expect(stored.preferences).toEqual({
      countryCode: 'GB',
      householdSize: 3,
      dietaryPreferences: ['vegetarian'],
      allergies: ['Peanuts'],
      dislikedIngredients: [],
      weeklyBudget: 85.5,
    });
  });
});
