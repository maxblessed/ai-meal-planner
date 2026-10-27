import type { LoginRequest, RegisterRequest } from '@ai-meal-planner/shared';
import type { Request, Response } from 'express';

import { requireAuth } from './auth.middleware';
import type { AuthService } from './auth.service';

type RefreshBody = { refreshToken: string };

export class AuthController {
  constructor(private readonly service: AuthService) {}

  register = async (req: Request<object, unknown, RegisterRequest>, res: Response) => {
    res.status(201).json({ data: await this.service.register(req.body) });
  };

  login = async (req: Request<object, unknown, LoginRequest>, res: Response) => {
    res.json({ data: await this.service.login(req.body) });
  };

  refresh = async (req: Request<object, unknown, RefreshBody>, res: Response) => {
    res.json({ data: { tokens: await this.service.refresh(req.body.refreshToken) } });
  };

  logout = async (req: Request<object, unknown, RefreshBody>, res: Response) => {
    await this.service.logout(req.body.refreshToken);
    res.json({ data: { loggedOut: true } });
  };

  me = async (req: Request, res: Response) => {
    res.json({ data: { user: await this.service.getCurrentUser(requireAuth(req).userId) } });
  };
}
