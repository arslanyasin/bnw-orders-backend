import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ShipmentsService } from './shipments.service';
import { DispatchOrderDto } from './dto/dispatch-order.dto';
import { ManualDispatchDto } from './dto/manual-dispatch.dto';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@common/interfaces/user-role.enum';
import { ParseObjectIdPipe } from '@common/pipes/parse-objectid.pipe';
import { ShipmentStatus } from './schemas/shipment.schema';
import { CourierType } from '@common/enums/courier-type.enum';

@ApiTags('Shipments')
@ApiBearerAuth('JWT-auth')
@Controller('shipments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Post('dispatch/bank-order/:id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.DISPATCH)
  @ApiOperation({ summary: 'Dispatch a bank order with courier' })
  @ApiParam({ name: 'id', description: 'Bank Order MongoDB ObjectId' })
  @ApiResponse({ status: 201, description: 'Order dispatched successfully' })
  @ApiResponse({ status: 400, description: 'Invalid order ID or order already dispatched' })
  @ApiResponse({ status: 404, description: 'Bank order not found' })
  @ApiResponse({ status: 500, description: 'Failed to book shipment with courier' })
  dispatchBankOrder(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dispatchOrderDto: DispatchOrderDto,
  ) {
    return this.shipmentsService.dispatchBankOrder(id, dispatchOrderDto);
  }

  @Post('dispatch/bip-order/:id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.DISPATCH)
  @ApiOperation({ summary: 'Dispatch a BIP order with courier' })
  @ApiParam({ name: 'id', description: 'BIP Order MongoDB ObjectId' })
  @ApiResponse({ status: 201, description: 'Order dispatched successfully' })
  @ApiResponse({ status: 400, description: 'Invalid order ID or order already dispatched' })
  @ApiResponse({ status: 404, description: 'BIP order not found' })
  @ApiResponse({ status: 500, description: 'Failed to book shipment with courier' })
  dispatchBipOrder(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dispatchOrderDto: DispatchOrderDto,
  ) {
    return this.shipmentsService.dispatchBipOrder(id, dispatchOrderDto);
  }

  @Post('dispatch/bank-order/:id/manual')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.DISPATCH)
  @ApiOperation({ summary: 'Manually dispatch a bank order with TCS Overland or Self Delivery (no API call)' })
  @ApiParam({ name: 'id', description: 'Bank Order MongoDB ObjectId' })
  @ApiResponse({ status: 201, description: 'Order dispatched manually with provided tracking details' })
  @ApiResponse({ status: 400, description: 'Invalid order ID, order already dispatched, or unsupported courier type' })
  @ApiResponse({ status: 404, description: 'Bank order not found or selected courier not configured' })
  dispatchBankOrderManually(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() manualDispatchDto: ManualDispatchDto,
  ) {
    return this.shipmentsService.dispatchBankOrderManually(id, manualDispatchDto);
  }

  @Post('dispatch/bip-order/:id/manual')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.DISPATCH)
  @ApiOperation({ summary: 'Manually dispatch a BIP order with TCS Overland or Self Delivery (no API call)' })
  @ApiParam({ name: 'id', description: 'BIP Order MongoDB ObjectId' })
  @ApiResponse({ status: 201, description: 'Order dispatched manually with provided tracking details' })
  @ApiResponse({ status: 400, description: 'Invalid order ID, order already dispatched, or unsupported courier type' })
  @ApiResponse({ status: 404, description: 'BIP order not found or selected courier not configured' })
  dispatchBipOrderManually(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() manualDispatchDto: ManualDispatchDto,
  ) {
    return this.shipmentsService.dispatchBipOrderManually(id, manualDispatchDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.DISPATCH)
  @ApiOperation({ summary: 'Get all shipments (paginated with filters)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ShipmentStatus,
    description: 'Filter by shipment status',
  })
  @ApiQuery({
    name: 'courierType',
    required: false,
    enum: CourierType,
    description: 'Filter by courier type',
  })
  @ApiQuery({
    name: 'city',
    required: false,
    type: String,
    description: 'Filter by delivery city',
  })
  @ApiResponse({
    status: 200,
    description: 'List of shipments with pagination and filters',
  })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: ShipmentStatus,
    @Query('courierType') courierType?: CourierType,
    @Query('city') city?: string,
  ) {
    return this.shipmentsService.findAll(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      status,
      courierType,
      city,
    );
  }

  @Get('tracking/:trackingNumber')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.DISPATCH)
  @ApiOperation({ summary: 'Get shipment by tracking number' })
  @ApiParam({ name: 'trackingNumber', description: 'Courier tracking number' })
  @ApiResponse({ status: 200, description: 'Shipment data' })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  findByTrackingNumber(@Param('trackingNumber') trackingNumber: string) {
    return this.shipmentsService.findByTrackingNumber(trackingNumber);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.DISPATCH)
  @ApiOperation({ summary: 'Get shipment by ID' })
  @ApiParam({ name: 'id', description: 'Shipment MongoDB ObjectId' })
  @ApiResponse({ status: 200, description: 'Shipment data with populated references' })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.shipmentsService.findOne(id);
  }

  @Get(':id/track')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.DISPATCH)
  @ApiOperation({ summary: 'Track shipment with courier API' })
  @ApiParam({ name: 'id', description: 'Shipment MongoDB ObjectId' })
  @ApiResponse({ status: 200, description: 'Shipment tracking information from courier' })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  @ApiResponse({ status: 501, description: 'Courier tracking not implemented' })
  trackShipment(@Param('id', ParseObjectIdPipe) id: string) {
    return this.shipmentsService.trackShipment(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.DISPATCH)
  @ApiOperation({ summary: 'Update shipment status' })
  @ApiParam({ name: 'id', description: 'Shipment MongoDB ObjectId' })
  @ApiResponse({ status: 200, description: 'Shipment status updated successfully' })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  updateStatus(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateShipmentStatusDto: UpdateShipmentStatusDto,
  ) {
    return this.shipmentsService.updateStatus(id, updateShipmentStatusDto);
  }

  @Post(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Cancel shipment (Admin/Staff only)' })
  @ApiParam({ name: 'id', description: 'Shipment MongoDB ObjectId' })
  @ApiQuery({
    name: 'reason',
    required: false,
    type: String,
    description: 'Cancellation reason',
  })
  @ApiResponse({ status: 200, description: 'Shipment cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Cannot cancel shipment with current status' })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  @ApiResponse({ status: 500, description: 'Failed to cancel shipment with courier' })
  cancelShipment(
    @Param('id', ParseObjectIdPipe) id: string,
    @Query('reason') reason?: string,
  ) {
    return this.shipmentsService.cancelShipment(id, reason);
  }
}
