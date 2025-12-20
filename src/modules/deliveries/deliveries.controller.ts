import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { DeliveriesService } from './deliveries.service';
import { AssignCourierDto } from './dto/assign-courier.dto';
import { UpdateTrackingDto } from './dto/update-tracking.dto';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';
import { Delivery, CourierCompany, DeliveryStatus } from './schemas/delivery.schema';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@common/interfaces/user-role.enum';

@ApiTags('Deliveries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'deliveries', version: '1' })
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Assign courier to a bank order' })
  @ApiResponse({
    status: 201,
    description: 'Courier assigned successfully',
    type: Delivery,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Bank order not found' })
  @ApiResponse({ status: 409, description: 'Delivery already exists for this order' })
  async assignCourier(
    @Body() assignCourierDto: AssignCourierDto,
  ): Promise<Delivery> {
    return this.deliveriesService.assignCourier(assignCourierDto);
  }

  @Patch(':id/tracking')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Update tracking information' })
  @ApiResponse({
    status: 200,
    description: 'Tracking updated successfully',
    type: Delivery,
  })
  @ApiResponse({ status: 400, description: 'Invalid delivery ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Delivery not found' })
  async updateTracking(
    @Param('id') id: string,
    @Body() updateTrackingDto: UpdateTrackingDto,
  ): Promise<Delivery> {
    return this.deliveriesService.updateTracking(id, updateTrackingDto);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Update delivery status' })
  @ApiResponse({
    status: 200,
    description: 'Delivery status updated successfully',
    type: Delivery,
  })
  @ApiResponse({ status: 400, description: 'Invalid delivery ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Delivery not found' })
  async updateDeliveryStatus(
    @Param('id') id: string,
    @Body() updateDeliveryStatusDto: UpdateDeliveryStatusDto,
  ): Promise<Delivery> {
    return this.deliveriesService.updateDeliveryStatus(
      id,
      updateDeliveryStatusDto,
    );
  }

  @Get('order/:bankOrderId')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.DISPATCH)
  @ApiOperation({ summary: 'View delivery by bank order ID' })
  @ApiResponse({
    status: 200,
    description: 'Delivery retrieved successfully',
    type: Delivery,
  })
  @ApiResponse({ status: 400, description: 'Invalid bank order ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findByBankOrder(
    @Param('bankOrderId') bankOrderId: string,
  ): Promise<Delivery | null> {
    return this.deliveriesService.findByBankOrder(bankOrderId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.DISPATCH)
  @ApiOperation({ summary: 'Get all deliveries with pagination and filters' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'courierCompany',
    required: false,
    enum: CourierCompany,
    description: 'Filter by courier company',
  })
  @ApiQuery({
    name: 'deliveryStatus',
    required: false,
    enum: DeliveryStatus,
    description: 'Filter by delivery status',
  })
  @ApiResponse({
    status: 200,
    description: 'Deliveries retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('courierCompany') courierCompany?: CourierCompany,
    @Query('deliveryStatus') deliveryStatus?: DeliveryStatus,
  ): Promise<{
    data: Delivery[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    return this.deliveriesService.findAll(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      courierCompany,
      deliveryStatus,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.DISPATCH)
  @ApiOperation({ summary: 'Get a single delivery by ID' })
  @ApiResponse({
    status: 200,
    description: 'Delivery retrieved successfully',
    type: Delivery,
  })
  @ApiResponse({ status: 400, description: 'Invalid delivery ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Delivery not found' })
  async findOne(@Param('id') id: string): Promise<Delivery> {
    return this.deliveriesService.findOne(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a delivery (soft delete)' })
  @ApiResponse({
    status: 200,
    description: 'Delivery deleted successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid delivery ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Delivery not found' })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.deliveriesService.remove(id);
  }
}
