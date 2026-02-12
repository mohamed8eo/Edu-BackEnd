import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtAuthPaylod } from '../types/jwtAuth';
import type { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return req.user as JwtAuthPaylod;
  },
);
