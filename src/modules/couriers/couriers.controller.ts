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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CouriersService } from './couriers.service';
import { CreateCourierDto } from './dto/create-courier.dto';
import { UpdateCourierDto } from './dto/update-courier.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@common/interfaces/user-role.enum';
import { ParseObjectIdPipe } from '@common/pipes/parse-objectid.pipe';
import { CourierType } from '@common/enums/courier-type.enum';

@ApiTags('Couriers')
@ApiBearerAuth('JWT-auth')
@Controller('couriers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CouriersController {
  constructor(private readonly couriersService: CouriersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new courier (Admin only)' })
  @ApiResponse({ status: 201, description: 'Courier created successfully' })
  @ApiResponse({ status: 409, description: 'Courier type already exists' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  create(@Body() createCourierDto: CreateCourierDto) {
    return this.couriersService.create(createCourierDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.DISPATCH)
  @ApiOperation({ summary: 'Get all couriers (paginated with filters)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'courierType',
    required: false,
    enum: CourierType,
    description: 'Filter by courier type (leopards or tcs)',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiResponse({
    status: 200,
    description: 'List of couriers with pagination and filters',
  })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('courierType') courierType?: CourierType,
    @Query('isActive') isActive?: string,
  ) {
    return this.couriersService.findAll(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      courierType,
      isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.DISPATCH)
  @ApiOperation({ summary: 'Get courier by ID' })
  @ApiParam({ name: 'id', description: 'Courier MongoDB ObjectId' })
  @ApiResponse({ status: 200, description: 'Courier data' })
  @ApiResponse({ status: 404, description: 'Courier not found' })
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.couriersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update courier (Admin only)' })
  @ApiParam({ name: 'id', description: 'Courier MongoDB ObjectId' })
  @ApiResponse({ status: 200, description: 'Courier updated successfully' })
  @ApiResponse({ status: 404, description: 'Courier not found' })
  @ApiResponse({ status: 409, description: 'Courier type already exists' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateCourierDto: UpdateCourierDto,
  ) {
    return this.couriersService.update(id, updateCourierDto);
  }

  @Patch(':id/toggle-active')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Toggle courier active status (Admin only)' })
  @ApiParam({ name: 'id', description: 'Courier MongoDB ObjectId' })
  @ApiResponse({ status: 200, description: 'Courier status toggled successfully' })
  @ApiResponse({ status: 404, description: 'Courier not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  toggleActive(@Param('id', ParseObjectIdPipe) id: string) {
    return this.couriersService.toggleActive(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete courier (Admin only)' })
  @ApiParam({ name: 'id', description: 'Courier MongoDB ObjectId' })
  @ApiResponse({ status: 200, description: 'Courier deleted successfully' })
  @ApiResponse({ status: 404, description: 'Courier not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.couriersService.remove(id);
  }
}
