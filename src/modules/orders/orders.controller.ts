import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@common/interfaces/user-role.enum';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '@common/pipes/parse-objectid.pipe';
import { OrderStatus } from './schemas/order.schema';

@ApiTags('Orders')
@ApiBearerAuth('JWT-auth')
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 403, description: 'Forbidden - Staff or Admin access required' })
  create(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser('_id') userId: string,
  ) {
    return this.ordersService.create(createOrderDto, userId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.DISPATCH)
  @ApiOperation({ summary: 'Get all orders (optional filter by status)' })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus, description: 'Filter by order status' })
  @ApiResponse({ status: 200, description: 'List of orders' })
  findAll(@Query('status') status?: OrderStatus) {
    return this.ordersService.findAll(status ? { status } : {});
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.DISPATCH)
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiParam({ name: 'id', description: 'Order MongoDB ObjectId' })
  @ApiResponse({ status: 200, description: 'Order data with populated user references' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.DISPATCH)
  @ApiOperation({ summary: 'Update order (status, priority, etc.)' })
  @ApiParam({ name: 'id', description: 'Order MongoDB ObjectId' })
  @ApiResponse({ status: 200, description: 'Order updated successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @CurrentUser('_id') userId: string,
  ) {
    return this.ordersService.update(id, updateOrderDto, userId);
  }

  @Patch(':id/assign')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Assign order to a user' })
  @ApiParam({ name: 'id', description: 'Order MongoDB ObjectId' })
  @ApiResponse({ status: 200, description: 'Order assigned successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Staff or Admin access required' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  assign(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body('assignedTo') assignedTo: string,
    @CurrentUser('_id') userId: string,
  ) {
    return this.ordersService.assignOrder(id, userId, assignedTo);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete order (Admin only)' })
  @ApiParam({ name: 'id', description: 'Order MongoDB ObjectId' })
  @ApiResponse({ status: 200, description: 'Order deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  remove(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('_id') userId: string,
  ) {
    return this.ordersService.remove(id, userId);
  }
}
