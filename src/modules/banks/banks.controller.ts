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
import { BanksService } from './banks.service';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto } from './dto/update-bank.dto';
import { Bank, BankStatus } from './schemas/bank.schema';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@common/interfaces/user-role.enum';

@ApiTags('Banks')
@ApiBearerAuth('JWT-auth')
@Controller('banks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BanksController {
  constructor(private readonly banksService: BanksService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new bank' })
  @ApiResponse({
    status: 201,
    description: 'Bank created successfully',
    type: Bank,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 409, description: 'Bank with this name already exists' })
  async create(@Body() createBankDto: CreateBankDto): Promise<Bank> {
    return this.banksService.create(createBankDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get all banks with pagination' })
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
    name: 'status',
    required: false,
    enum: BankStatus,
    description: 'Filter by bank status',
  })
  @ApiResponse({
    status: 200,
    description: 'Banks retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: BankStatus,
  ): Promise<{
    data: Bank[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    return this.banksService.findAll(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      status,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get a single bank by ID' })
  @ApiResponse({
    status: 200,
    description: 'Bank retrieved successfully',
    type: Bank,
  })
  @ApiResponse({ status: 400, description: 'Invalid bank ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Bank not found' })
  async findOne(@Param('id') id: string): Promise<Bank> {
    return this.banksService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a bank' })
  @ApiResponse({
    status: 200,
    description: 'Bank updated successfully',
    type: Bank,
  })
  @ApiResponse({ status: 400, description: 'Invalid bank ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Bank not found' })
  @ApiResponse({ status: 409, description: 'Bank with this name already exists' })
  async update(
    @Param('id') id: string,
    @Body() updateBankDto: UpdateBankDto,
  ): Promise<Bank> {
    return this.banksService.update(id, updateBankDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a bank (soft delete)' })
  @ApiResponse({
    status: 200,
    description: 'Bank deleted successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid bank ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Bank not found' })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.banksService.remove(id);
  }
}
