import type { ParsedCreateMealPlanRequest } from '@ai-meal-planner/shared';
import type { Request, Response } from 'express';

import type { MealPlanService } from './meal-plan.service';

type IdParams = { id: string };
type ReplaceParams = IdParams & { mealId: string };

/** Translates HTTP to service calls and back. Request bodies are already validated. */
export class MealPlanController {
  constructor(private readonly service: MealPlanService) {}

  create = async (req: Request<object, unknown, ParsedCreateMealPlanRequest>, res: Response) => {
    res.status(201).json({ data: await this.service.createPlan(req.body) });
  };

  list = async (_req: Request, res: Response) => {
    res.json({ data: await this.service.listPlans() });
  };

  get = async (req: Request<IdParams>, res: Response) => {
    res.json({ data: await this.service.getPlan(req.params.id) });
  };

  replaceMeal = async (req: Request<ReplaceParams>, res: Response) => {
    res.json({ data: await this.service.replaceMeal(req.params.id, req.params.mealId) });
  };
}
