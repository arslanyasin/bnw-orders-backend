import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  Res,
  HttpStatus,
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
    );
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
