import type { ParsedCreateMealPlanRequest } from '@ai-meal-planner/shared';
import type { Request, Response } from 'express';

import { requireAuth } from '../auth/auth.middleware';
import type { MealPlanService } from './meal-plan.service';

type IdParams = { id: string };
type ReplaceParams = IdParams & { mealId: string };

/** Translates HTTP to service calls and back. Bodies are validated and the caller is authenticated by middleware. */
export class MealPlanController {
  constructor(private readonly service: MealPlanService) {}

  create = async (req: Request<object, unknown, ParsedCreateMealPlanRequest>, res: Response) => {
    res.status(201).json({ data: await this.service.createPlan(requireAuth(req).userId, req.body) });
  };

  list = async (req: Request, res: Response) => {
    res.json({ data: await this.service.listPlans(requireAuth(req).userId) });
  };

  get = async (req: Request<IdParams>, res: Response) => {
    res.json({ data: await this.service.getPlan(requireAuth(req).userId, req.params.id) });
  };

  replaceMeal = async (req: Request<ReplaceParams>, res: Response) => {
    res.json({ data: await this.service.replaceMeal(requireAuth(req).userId, req.params.id, req.params.mealId) });
  };
}
