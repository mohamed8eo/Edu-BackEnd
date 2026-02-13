/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TrafficLog } from './dto/trafficLog.dto';
import { db } from '../db';
import { eq, gte, sql, desc } from 'drizzle-orm';
import { trafficLogs, user } from '../db/schema';

@Injectable()
export class TrafficService {
  private readonly logger = new Logger('TrafficService');

  async log(data: TrafficLog) {
    await db.insert(trafficLogs).values({
      method: data.method,
      path: data.path,
      statusCode: data.statusCode,
      durationMs: data.durationMs,
      ip: data.ip,
      userAgent: data.userAgent,
      userId: data.userId,
      createdAt: data.timestamp,
    });
  }

  async getDailyTraffic() {
    return db
      .select({
        day: sql<string>`DATE(${trafficLogs.createdAt})`,
        requests: sql<number>`COUNT(*)`,
      })
      .from(trafficLogs)
      .groupBy(sql`DATE(${trafficLogs.createdAt})`)
      .orderBy(sql`DATE(${trafficLogs.createdAt})`);
  }

  async getTopEndpoints() {
    return db
      .select({
        path: trafficLogs.path,
        method: trafficLogs.method,
        statusCode: trafficLogs.statusCode,
        hits: sql<number>`COUNT(*)`,
        averageDuration: sql<number>`AVG(${trafficLogs.durationMs})`,
      })
      .from(trafficLogs)
      .groupBy(trafficLogs.path, trafficLogs.method, trafficLogs.statusCode)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);
  }

  async getSlowEndpoints() {
    return db
      .select({
        path: trafficLogs.path,
        method: trafficLogs.method,
        statusCode: trafficLogs.statusCode,
        hits: sql<number>`COUNT(*)`,
        averageDuration: sql<number>`AVG(${trafficLogs.durationMs})`,
      })
      .from(trafficLogs)
      .groupBy(trafficLogs.path, trafficLogs.method, trafficLogs.statusCode)
      .having(sql`COUNT(*) >= 10`)
      .orderBy(sql`AVG(${trafficLogs.durationMs}) DESC`)
      .limit(10);
  }

  async getHttpStatusCodes() {
    return db
      .select({
        statusCode: trafficLogs.statusCode,
        count: sql<number>`COUNT(*)`,
      })
      .from(trafficLogs)
      .where(gte(trafficLogs.statusCode, 200))
      .groupBy(trafficLogs.statusCode)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);
  }

  /**
   * Get aggregated dashboard statistics
   */
  async getDashboardStats() {
    // 1. Query all traffic metrics in one go
    const trafficStats = await db
      .select({
        totalRequests: sql<number>`COUNT(*)::int`,
        errorRequests: sql<number>`
          COUNT(*) FILTER (WHERE ${trafficLogs.statusCode} >= 400)::int
        `,
        averageResponseTime: sql<number>`AVG(${trafficLogs.durationMs})`,
        activeUsersCount: sql<number>`
          COUNT(DISTINCT ${trafficLogs.userId})::int
        `,
      })
      .from(trafficLogs);

    // 2. Extract values from the result
    const {
      totalRequests,
      errorRequests,
      averageResponseTime,
      activeUsersCount,
    } = trafficStats[0] || {
      totalRequests: 0,
      errorRequests: 0,
      averageResponseTime: 0,
      activeUsersCount: 0,
    };

    // 3. Compute error rate
    const errorRate =
      totalRequests > 0
        ? parseFloat(((errorRequests / totalRequests) * 100).toFixed(2))
        : 0;

    // 4. Get total users count from database
    const totalUsersResult = await db
      .select({
        count: sql<number>`COUNT(*)::int`,
      })
      .from(user);

    const totalUsers = totalUsersResult[0]?.count || 0;

    // 5. Return aggregated dashboard data
    return {
      totalRequests,
      errorRequests,
      errorRate, // in percentage
      averageResponseTime: Math.round(averageResponseTime || 0), // in ms
      activeUsers: activeUsersCount,
      totalUsers,
    };
  }

  /**
   * Get user information by ID
   */
  async getUserInfo(userId: string) {
    const [userInfo] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!userInfo) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return userInfo;
  }

  /**
   * Get all users with pagination
   */
  async getAllUsers(page: number = 1, limit: number = 10) {
    // Validate and sanitize inputs
    const validPage = Math.max(1, page);
    const validLimit = Math.min(Math.max(1, limit), 100); // Max 100 per page
    const offset = (validPage - 1) * validLimit;

    // Get users with pagination
    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt))
      .limit(validLimit)
      .offset(offset);

    // Get total count for pagination metadata
    const [{ count: totalUsers }] = await db
      .select({
        count: sql<number>`COUNT(*)::int`,
      })
      .from(user);

    return {
      data: users,
      pagination: {
        page: validPage,
        limit: validLimit,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / validLimit),
      },
    };
  }

  /**
   * Get user role by user ID
   */
  async getUserRole(userId: string): Promise<string | null> {
    const [result] = await db
      .select({
        role: user.role,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    return result?.role || null;
  }

  /**
   * Check if user is admin
   */
  async isUserAdmin(userId: string): Promise<boolean> {
    const role = await this.getUserRole(userId);
    return role === 'admin';
  }

  // Utility method (if needed elsewhere)
  private parseDuration(value: string): number {
    if (value.endsWith('d')) return Number(value.slice(0, -1)) * 86400;
    if (value.endsWith('h')) return Number(value.slice(0, -1)) * 3600;
    if (value.endsWith('m')) return Number(value.slice(0, -1)) * 60;
    return Number(value);
  }
}
