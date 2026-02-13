/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { TrafficService } from './traffic.service';

@Injectable()
export class TrafficMiddleware implements NestMiddleware {
  constructor(
    private readonly trafficService: TrafficService,
    private readonly jwtService: JwtService,
  ) {}

  async use(req: Request, res: Response, next: () => void) {
    // Skip admin routes
    if (req.originalUrl.startsWith('/admin')) {
      next();
      return;
    }

    const start = Date.now();
    let userId: string | null = null;

    try {
      // Extract JWT token from Authorization header
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify and decode the JWT token
        const payload = await this.jwtService.verifyAsync(token);

        // Extract user ID from payload
        // Adjust the property name based on your JWT payload structure
        userId = payload.sub || payload.userId || payload.id || null;
      }
    } catch (err) {
      // JWT verification failed → continue without user
      console.log('JWT verification failed:', err.message);
      userId = null;
    }

    // Log traffic after response finishes
    res.on('finish', () => {
      const duration = Date.now() - start;
      void this.trafficService.log({
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: duration,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        userId: userId,
        timestamp: new Date(),
      });
    });

    next();
  }
}
