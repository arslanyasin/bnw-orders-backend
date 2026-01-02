import {
  Controller,
  Post,
  Get,
  Patch,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Query,
  Param,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { BipService } from './bip.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@common/interfaces/user-role.enum';
import { ParseObjectIdPipe } from '@common/pipes/parse-objectid.pipe';
import { UpdateOrderStatusDto } from '@common/dto/update-order-status.dto';

@ApiTags('BIP Orders')
@ApiBearerAuth('JWT-auth')
@Controller('bip')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BipController {
  constructor(private readonly bipService: BipService) {}

  @Post('import')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Import BIP orders from Excel file (Admin/Staff only)' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({
    name: 'bankId',
    required: true,
    type: String,
    description: 'Bank MongoDB ObjectId',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Excel file (.xlsx or .xls) with columns: EFORMS, CNIC, CUSTOMER_NAME, MOBILE1, authorized_receiver, receiver_cnic, ADDRESS, CITY, PRODUCT, GIFTCODE, Qty, PO #, ORDER DATE, AMOUNT, COLOR',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File processed successfully with import results',
    schema: {
      example: {
        success: true,
        data: {
          totalRows: 100,
          successCount: 95,
          failedCount: 5,
          successRecords: [
            {
              row: 2,
              id: '65a1b2c3d4e5f6g7h8i9j0k1',
              eforms: 'EFORM-2024-001',
              customerName: 'John Doe',
            },
          ],
          failedRecords: [
            {
              row: 10,
              data: { CNIC: '', CUSTOMER_NAME: 'Jane Doe' },
              errors: ['CNIC is required'],
            },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid file or data' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Bank not found' })
  async importOrders(
    @UploadedFile() file: Express.Multer.File,
    @Query('bankId') bankId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!bankId) {
      throw new BadRequestException('Bank ID is required');
    }

    return this.bipService.importFromExcel(file, bankId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.DISPATCH)
  @ApiOperation({ summary: 'Get all BIP orders (paginated with search)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by customer name, CNIC, eforms, PO number, or city' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by order status' })
  @ApiQuery({ name: 'city', required: false, type: String, description: 'Filter by city' })
  @ApiQuery({ name: 'bankId', required: false, type: String, description: 'Filter by bank ID' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Filter by start date (ISO format)', example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Filter by end date (ISO format)', example: '2024-12-31' })
  @ApiResponse({ status: 200, description: 'List of BIP orders with pagination' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('city') city?: string,
    @Query('bankId') bankId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.bipService.findAll(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      search,
      status,
      city,
      bankId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.DISPATCH)
  @ApiOperation({ summary: 'Get BIP order by ID' })
  @ApiParam({ name: 'id', description: 'BIP Order MongoDB ObjectId' })
  @ApiResponse({ status: 200, description: 'BIP order data' })
  @ApiResponse({ status: 404, description: 'BIP order not found' })
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.bipService.findOne(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Update BIP order status (Admin/Staff only)' })
  @ApiParam({ name: 'id', description: 'BIP Order MongoDB ObjectId' })
  @ApiResponse({ status: 200, description: 'Order status updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid status or order ID' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'BIP order not found' })
  updateStatus(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    return this.bipService.updateStatus(id, updateOrderStatusDto);
  }
}
