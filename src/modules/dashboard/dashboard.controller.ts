import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@common/interfaces/user-role.enum';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.DISPATCH)
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          bankOrders: {
            total: 150,
            completed: 120,
            active: 30,
          },
          products: {
            total: 45,
            inStock: 45,
            active: 45,
          },
          vendors: {
            total: 12,
            newVendors: 3,
            active: 10,
          },
          purchaseOrders: {
            total: 25,
            capacityPercentage: 80,
            active: 20,
          },
        },
      },
    },
  })
  async getStats() {
    return this.dashboardService.getStats();
  }
}
