import { createMealPlanRequestSchema } from '@ai-meal-planner/shared';
import { Router } from 'express';

import { validate } from '../../infrastructure/http/validate';
import type { MealPlanController } from './meal-plan.controller';
import { mealPlanIdParamsSchema, replaceMealBodySchema, replaceMealParamsSchema } from './meal-plan.schemas';

export function createMealPlanRouter(controller: MealPlanController): Router {
  const router = Router();

  router.post('/', validate({ body: createMealPlanRequestSchema }), controller.create);
  router.get('/', controller.list);
  router.get('/:id', validate({ params: mealPlanIdParamsSchema }), controller.get);
  router.post(
    '/:id/meals/:mealId/replace',
    validate({ params: replaceMealParamsSchema, body: replaceMealBodySchema }),
    controller.replaceMeal,
  );

  return router;
}
