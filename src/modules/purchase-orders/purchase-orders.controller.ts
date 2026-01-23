import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  Res,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { BulkUpdatePurchaseOrdersDto } from './dto/bulk-update-purchase-orders.dto';
import { BulkCreatePurchaseOrdersDto } from './dto/bulk-create-purchase-orders.dto';
import { CombinePreviewDto } from './dto/combine-preview.dto';
import { MergePOsDto } from './dto/merge-pos.dto';
import { PurchaseOrder } from './schemas/purchase-order.schema';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@common/interfaces/user-role.enum';
import {
  generatePurchaseOrderPDF,
  PurchaseOrderPDFData,
} from './utils/pdf-generator';

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'purchase-orders', version: '1' })
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new purchase order' })
  @ApiResponse({
    status: 201,
    description: 'Purchase order created successfully',
    type: PurchaseOrder,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Vendor or Product not found' })
  async create(
    @Body() createPurchaseOrderDto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    return this.purchaseOrdersService.create(createPurchaseOrderDto);
  }

  @Post('bulk-create')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Bulk create purchase orders from multiple bank/BIP orders' })
  @ApiResponse({
    status: 201,
    description: 'Bulk purchase orders creation completed with success and failure summary',
    schema: {
      example: {
        successCount: 3,
        failedCount: 1,
        successfulCreations: [
          { orderId: '507f1f77bcf86cd799439011', poNumber: 'PO-2024-0001', orderType: 'bank-order' },
          { orderId: '507f1f77bcf86cd799439012', poNumber: 'PO-2024-0002', orderType: 'bank-order' },
          { orderId: '507f1f77bcf86cd799439013', poNumber: 'PO-2024-0003', orderType: 'bip-order' },
        ],
        failedCreations: [
          { orderId: '507f1f77bcf86cd799439014', orderType: 'bank-order', error: 'Bank order not found' },
        ],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error or no order IDs provided' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  async bulkCreate(@Body() bulkCreateDto: BulkCreatePurchaseOrdersDto) {
    return this.purchaseOrdersService.bulkCreatePurchaseOrders(bulkCreateDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get all purchase orders with pagination' })
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
    name: 'vendorId',
    required: false,
    type: String,
    description: 'Filter by vendor ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by status (draft, active, merged, cancelled)',
    example: 'active',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by vendor name, product name, product code, PO number, or eForms',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter by start date (ISO format)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter by end date (ISO format)',
    example: '2024-12-31',
  })
  @ApiResponse({
    status: 200,
    description: 'Purchase orders retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('vendorId') vendorId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<{
    data: PurchaseOrder[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    return this.purchaseOrdersService.findAll(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      vendorId,
      status,
      search,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('export')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Export purchase orders to Excel filtered by bank ID and date range' })
  @ApiQuery({
    name: 'bankId',
    required: true,
    type: String,
    description: 'Bank ID to filter purchase orders',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter by start date (ISO format)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter by end date (ISO format)',
    example: '2024-12-31',
  })
  @ApiResponse({
    status: 200,
    description: 'Excel file generated successfully',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Missing or invalid bankId' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async exportPurchaseOrders(
    @Query('bankId') bankId: string,
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<void> {
    if (!bankId) {
      throw new BadRequestException('Bank ID is required');
    }

    const excelBuffer = await this.purchaseOrdersService.exportByBankId(
      bankId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    const filename = `purchase-orders-${bankId}-${Date.now()}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', excelBuffer.length);

    res.status(HttpStatus.OK).send(excelBuffer);
  }

  @Get('combinable/list')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get list of POs that can be combined for a vendor' })
  @ApiQuery({
    name: 'vendorId',
    required: true,
    type: String,
    description: 'Vendor ID to filter POs',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date for filtering (ISO format)',
    example: '2024-01-15',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date for filtering (ISO format)',
    example: '2024-01-15',
  })
  @ApiResponse({
    status: 200,
    description: 'Combinable POs retrieved successfully',
    type: [PurchaseOrder],
  })
  @ApiResponse({ status: 400, description: 'Invalid vendor ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getCombinablePOs(
    @Query('vendorId') vendorId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<PurchaseOrder[]> {
    return this.purchaseOrdersService.getCombinablePOs(
      vendorId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Post('combine/preview')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Generate preview of combined POs without saving' })
  @ApiResponse({
    status: 200,
    description: 'Combined preview generated successfully',
    schema: {
      example: {
        poNumbers: ['PO-2024-0001', 'PO-2024-0002'],
        vendor: {
          _id: '507f1f77bcf86cd799439011',
          vendorName: 'ABC Suppliers',
          email: 'contact@abc.com',
        },
        products: [
          {
            productName: 'Samsung Galaxy S24',
            quantity: 5,
            unitPrice: 50000,
            totalPrice: 250000,
            sourcePO: 'PO-2024-0001',
          },
        ],
        totalAmount: 540000,
        originalPOsCount: 2,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'POs not found' })
  async generateCombinedPreview(@Body() combinePreviewDto: CombinePreviewDto) {
    return this.purchaseOrdersService.generateCombinedPreview(
      combinePreviewDto.poIds,
    );
  }

  @Post('merge')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Permanently merge multiple POs into one (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'POs merged successfully',
    type: PurchaseOrder,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'POs not found' })
  async mergePOs(@Body() mergePOsDto: MergePOsDto): Promise<PurchaseOrder> {
    return this.purchaseOrdersService.mergePermanently(
      mergePOsDto.poIds,
      mergePOsDto.newPoNumber,
    );
  }

  @Get('vendor/:vendorId')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get purchase order history for a specific vendor' })
  @ApiResponse({
    status: 200,
    description: 'Vendor purchase orders retrieved successfully',
    type: [PurchaseOrder],
  })
  @ApiResponse({ status: 400, description: 'Invalid vendor ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findByVendor(
    @Param('vendorId') vendorId: string,
  ): Promise<PurchaseOrder[]> {
    return this.purchaseOrdersService.findByVendor(vendorId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get a single purchase order by ID' })
  @ApiResponse({
    status: 200,
    description: 'Purchase order retrieved successfully',
    type: PurchaseOrder,
  })
  @ApiResponse({ status: 400, description: 'Invalid purchase order ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  async findOne(@Param('id') id: string): Promise<PurchaseOrder> {
    return this.purchaseOrdersService.findOne(id);
  }

  @Get(':id/download')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Download purchase order as PDF' })
  @ApiResponse({
    status: 200,
    description: 'PDF generated successfully',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid purchase order ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  async downloadPDF(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const purchaseOrder = await this.purchaseOrdersService.findOne(id);

    // Type assertion to access populated vendor fields
    const vendor = purchaseOrder.vendorId as any;

    // Prepare PDF data
    const pdfData: PurchaseOrderPDFData = {
      poNumber: purchaseOrder.poNumber,
      vendorName: vendor.vendorName || 'N/A',
      vendorEmail: vendor.email,
      vendorPhone: vendor.phone,
      vendorAddress: vendor.address,
      vendorCity: vendor.city,
      products: purchaseOrder.products.map((p) => ({
        productName: p.productName,
        bankProductNumber: p.bankProductNumber,
        productColor: p.productColor,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        totalPrice: p.totalPrice,
      })),
      totalAmount: purchaseOrder.totalAmount,
      createdAt: purchaseOrder.createdAt!,
    };

    // Generate PDF
    const pdfBuffer = await generatePurchaseOrderPDF(pdfData);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${purchaseOrder.poNumber}.pdf"`,
    );
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF
    res.status(HttpStatus.OK).send(pdfBuffer);
  }

  @Post('bulk-update')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Bulk update multiple purchase orders with serial numbers (Admin/Staff only)' })
  @ApiResponse({
    status: 200,
    description: 'Bulk update completed with success and failure summary',
    schema: {
      example: {
        successCount: 3,
        failedCount: 1,
        successfulUpdates: [
          { poId: '507f1f77bcf86cd799439011', poNumber: 'PO-2024-0001' },
          { poId: '507f1f77bcf86cd799439012', poNumber: 'PO-2024-0002' },
          { poId: '507f1f77bcf86cd799439013', poNumber: 'PO-2024-0003' },
        ],
        failedUpdates: [
          { poId: '507f1f77bcf86cd799439014', error: 'Purchase order not found' },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async bulkUpdate(@Body() bulkUpdateDto: BulkUpdatePurchaseOrdersDto) {
    return this.purchaseOrdersService.bulkUpdate(bulkUpdateDto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Update purchase order with product serial numbers (Admin/Staff only)' })
  @ApiResponse({
    status: 200,
    description: 'Purchase order updated successfully',
    type: PurchaseOrder,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid ID, merged PO cannot be updated, or product not found',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  async updateWithPut(
    @Param('id') id: string,
    @Body() updatePurchaseOrderDto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    return this.purchaseOrdersService.update(id, updatePurchaseOrderDto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Update purchase order with product serial numbers (Admin/Staff only)' })
  @ApiResponse({
    status: 200,
    description: 'Purchase order updated successfully',
    type: PurchaseOrder,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid ID, merged PO cannot be updated, or product not found',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  async update(
    @Param('id') id: string,
    @Body() updatePurchaseOrderDto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    return this.purchaseOrdersService.update(id, updatePurchaseOrderDto);
  }

  @Post(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Cancel a purchase order (Admin/Staff only)' })
  @ApiResponse({
    status: 200,
    description: 'Purchase order cancelled successfully',
    type: PurchaseOrder,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - PO already cancelled or merged PO cannot be cancelled',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  async cancel(
    @Param('id') id: string,
    @Query('reason') reason?: string,
  ): Promise<PurchaseOrder> {
    return this.purchaseOrdersService.cancel(id, reason);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a purchase order (soft delete)' })
  @ApiResponse({
    status: 200,
    description: 'Purchase order deleted successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid purchase order ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.purchaseOrdersService.remove(id);
  }
}
