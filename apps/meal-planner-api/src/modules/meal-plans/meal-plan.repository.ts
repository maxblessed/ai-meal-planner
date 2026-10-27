import { randomBytes } from 'node:crypto';

import { mealPlanSchema, type MealPlan, type MealPlanDay } from '@ai-meal-planner/shared';

import { connectToDatabase } from '../../infrastructure/database/mongodb';
import { MealPlanModel } from './meal-plan.model';
import type { MealPlanRepository, NewMealPlan } from './meal-plan.types';

type Connection = { uri: string | undefined; dbName: string | undefined };

export class MongoMealPlanRepository implements MealPlanRepository {
  constructor(private readonly connection: Connection) {}

  private async ready() {
    await connectToDatabase(this.connection.uri, this.connection.dbName);
  }

  async create(plan: NewMealPlan): Promise<MealPlan> {
    await this.ready();
    const created = await MealPlanModel.create(plan);
    return this.toPlan(created.toObject());
  }

  async findById(ownerId: string, id: string): Promise<MealPlan | null> {
    await this.ready();
    const doc = await MealPlanModel.findOne({ _id: id, ownerId }).lean();
    return doc ? this.toPlan(doc) : null;
  }

  async list(ownerId: string, limit: number): Promise<MealPlan[]> {
    await this.ready();
    // ObjectIds are time-ordered, so sorting by _id gives newest first.
    const docs = await MealPlanModel.find({ ownerId }).sort({ _id: -1 }).limit(limit).lean();
    return docs.map((doc) => this.toPlan(doc));
  }

  async updateDays(ownerId: string, id: string, days: MealPlanDay[]): Promise<MealPlan | null> {
    await this.ready();
    const doc = await MealPlanModel.findOneAndUpdate({ _id: id, ownerId }, { $set: { days } }, { new: true }).lean();
    return doc ? this.toPlan(doc) : null;
  }

  /** Re-validates stored data against the contract so schema drift fails loudly, not in the client. */
  private toPlan(doc: object & { _id?: unknown }): MealPlan {
    const { _id, ...rest } = doc;
    return mealPlanSchema.parse({ ...JSON.parse(JSON.stringify(rest)), id: String(_id) });
  }
}

/** Development/test repository. Data is lost when the process exits. */
export class InMemoryMealPlanRepository implements MealPlanRepository {
  private readonly plans = new Map<string, MealPlan & { ownerId: string }>();

  async create({ ownerId, ...plan }: NewMealPlan): Promise<MealPlan> {
    const created = { ...plan, id: randomBytes(12).toString('hex') };
    this.plans.set(created.id, structuredClone({ ...created, ownerId }));
    return created;
  }

  async findById(ownerId: string, id: string): Promise<MealPlan | null> {
    const plan = this.plans.get(id);
    return plan?.ownerId === ownerId ? this.publicCopy(plan) : null;
  }

  async list(ownerId: string, limit: number): Promise<MealPlan[]> {
    return [...this.plans.values()]
      .filter((plan) => plan.ownerId === ownerId)
      .reverse()
      .slice(0, limit)
      .map((plan) => this.publicCopy(plan));
  }

  async updateDays(ownerId: string, id: string, days: MealPlanDay[]): Promise<MealPlan | null> {
    const plan = this.plans.get(id);
    if (!plan || plan.ownerId !== ownerId) return null;
    const updated = { ...plan, days: structuredClone(days) };
    this.plans.set(id, updated);
    return this.publicCopy(updated);
  }

  private publicCopy(plan: MealPlan & { ownerId: string }): MealPlan {
    const copy: MealPlan & { ownerId?: string } = structuredClone(plan);
    delete copy.ownerId;
    return copy;
  }
}
