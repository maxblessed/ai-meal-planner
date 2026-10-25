import type { MealPlan } from '@ai-meal-planner/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useRequiredPreferences } from '@/features/preferences';
import { getApiClient } from '../api/apiClient';

export const mealPlanKeys = {
  all: ['meal-plans'] as const,
  list: () => [...mealPlanKeys.all, 'list'] as const,
  detail: (id: string) => [...mealPlanKeys.all, 'detail', id] as const,
};

/** Local calendar date (not UTC), so "today" matches what the user sees on their device. */
function localIsoDate(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** All plans, newest first. The first entry is the user's current plan. */
export function useMealPlans() {
  return useQuery({ queryKey: mealPlanKeys.list(), queryFn: () => getApiClient().mealPlans.list() });
}

export function useMealPlan(id: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: mealPlanKeys.detail(id),
    queryFn: () => getApiClient().mealPlans.get(id),
    // Show the cached copy from the list immediately, then confirm with the server.
    initialData: () => queryClient.getQueryData<MealPlan[]>(mealPlanKeys.list())?.find((plan) => plan.id === id),
  });
}

/** Creates a plan from the user's saved preferences. */
export function useGenerateMealPlan() {
  const queryClient = useQueryClient();
  const preferences = useRequiredPreferences();

  return useMutation({
    mutationFn: () =>
      getApiClient().mealPlans.create({ ...preferences, startDate: localIsoDate(), days: 7 }),
    onSuccess: (plan) => {
      queryClient.setQueryData(mealPlanKeys.detail(plan.id), plan);
      return queryClient.invalidateQueries({ queryKey: mealPlanKeys.list() });
    },
  });
}

export function useReplaceMeal(planId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mealId: string) => getApiClient().mealPlans.replaceMeal(planId, mealId),
    onSuccess: (plan) => {
      queryClient.setQueryData(mealPlanKeys.detail(plan.id), plan);
      return queryClient.invalidateQueries({ queryKey: mealPlanKeys.list() });
    },
  });
}

