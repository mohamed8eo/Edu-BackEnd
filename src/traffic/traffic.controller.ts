import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { TrafficService } from './traffic.service';
import { AdminGuard } from '../auth/guards/admin-guard/admin-guard.guard';

@Controller('admin')
@UseGuards(AdminGuard) // Apply both guards to all routes
export class TrafficController {
  constructor(private readonly trafficService: TrafficService) {}

  @Get('traffic/daily')
  async getDailyTraffic() {
    return this.trafficService.getDailyTraffic();
  }

  @Get('traffic/top-endpoints')
  async getTopEndpoints() {
    return this.trafficService.getTopEndpoints();
  }

  @Get('traffic/slow-endpoints')
  async getSlowEndpoints() {
    return this.trafficService.getSlowEndpoints();
  }

  @Get('traffic/error-stats')
  async getErrorStats() {
    return this.trafficService.getHttpStatusCodes();
  }

  @Get('user/:id')
  async getUserInfo(@Param('id') id: string) {
    // You have access to currentUser if needed for audit logging
    return this.trafficService.getUserInfo(id);
  }

  @Get('traffic/dashboard-stats')
  async getDashboardStats() {
    return this.trafficService.getDashboardStats();
  }

  @Get('all-users')
  async getAllUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.trafficService.getAllUsers(
      parseInt(page || '1'),
      parseInt(limit || '10'),
    );
  }
}
