import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { DeliveryChallansService } from './delivery-challans.service';
import { CreateDeliveryChallanDto } from './dto/create-delivery-challan.dto';
import { BulkDownloadChallansDto } from './dto/bulk-download-challans.dto';
import { DeliveryChallan } from './schemas/delivery-challan.schema';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@common/interfaces/user-role.enum';
import {
  generateDeliveryChallanPDF,
  DeliveryChallanPDFData,
} from './utils/challan-pdf-generator';

@ApiTags('Delivery Challans')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'delivery-challans', version: '1' })
export class DeliveryChallansController {
  constructor(
    private readonly deliveryChallansService: DeliveryChallansService,
  ) {}

  @Post('bank-order/:id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Create delivery challan for a bank order' })
  @ApiParam({
    name: 'id',
    description: 'Bank Order ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 201,
    description: 'Delivery challan created successfully',
    type: DeliveryChallan,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error or order not dispatched' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Bank order or shipment not found' })
  async createForBankOrder(
    @Param('id') id: string,
    @Body() createDeliveryChallanDto: CreateDeliveryChallanDto,
  ): Promise<DeliveryChallan> {
    return this.deliveryChallansService.createForBankOrder(
      id,
      createDeliveryChallanDto,
    );
  }

  @Post('bip-order/:id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Create delivery challan for a BIP order' })
  @ApiParam({
    name: 'id',
    description: 'BIP Order ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 201,
    description: 'Delivery challan created successfully',
    type: DeliveryChallan,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error or order not dispatched' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'BIP order or shipment not found' })
  async createForBipOrder(
    @Param('id') id: string,
    @Body() createDeliveryChallanDto: CreateDeliveryChallanDto,
  ): Promise<DeliveryChallan> {
    return this.deliveryChallansService.createForBipOrder(
      id,
      createDeliveryChallanDto,
    );
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get all delivery challans with pagination' })
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
    name: 'trackingNumber',
    required: false,
    type: String,
    description: 'Filter by tracking number',
  })
  @ApiQuery({
    name: 'customerName',
    required: false,
    type: String,
    description: 'Filter by customer name',
  })
  @ApiResponse({
    status: 200,
    description: 'Delivery challans retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('trackingNumber') trackingNumber?: string,
    @Query('customerName') customerName?: string,
  ): Promise<{
    data: DeliveryChallan[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    return this.deliveryChallansService.findAll(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      trackingNumber,
      customerName,
    );
  }

  @Get('order/:orderType/:orderId')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get delivery challan for a specific order' })
  @ApiParam({
    name: 'orderType',
    description: 'Order type',
    enum: ['bank-order', 'bip-order'],
    example: 'bank-order',
  })
  @ApiParam({
    name: 'orderId',
    description: 'Order ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Delivery challan retrieved successfully',
    type: DeliveryChallan,
  })
  @ApiResponse({ status: 400, description: 'Invalid order ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Delivery challan not found' })
  async findByOrder(
    @Param('orderType') orderType: 'bank-order' | 'bip-order',
    @Param('orderId') orderId: string,
  ): Promise<DeliveryChallan | null> {
    return this.deliveryChallansService.findByOrder(orderId, orderType);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get a single delivery challan by ID' })
  @ApiParam({
    name: 'id',
    description: 'Delivery Challan ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Delivery challan retrieved successfully',
    type: DeliveryChallan,
  })
  @ApiResponse({ status: 400, description: 'Invalid delivery challan ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Delivery challan not found' })
  async findOne(@Param('id') id: string): Promise<DeliveryChallan> {
    return this.deliveryChallansService.findOne(id);
  }

  @Post('bulk-download')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Bulk download and merge multiple delivery challans into one PDF' })
  @ApiResponse({
    status: 200,
    description: 'Merged PDF generated successfully',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid IDs' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'No delivery challans found' })
  async bulkDownload(
    @Body() bulkDownloadDto: BulkDownloadChallansDto,
    @Res() res: Response,
  ): Promise<void> {
    const { mergedPDF, challanIds } = await this.deliveryChallansService.bulkDownloadChallans(
      bulkDownloadDto,
    );

    // Mark all challans as printed
    await this.deliveryChallansService.markMultipleAsPrinted(challanIds);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `delivery-challans-${timestamp}.pdf`;

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.setHeader('Content-Length', mergedPDF.length);

    // Send merged PDF
    res.status(HttpStatus.OK).send(mergedPDF);
  }

  @Get(':id/download')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Download delivery challan as PDF' })
  @ApiParam({
    name: 'id',
    description: 'Delivery Challan ID',
    example: '507f1f77bcf86cd799439011',
  })
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
  @ApiResponse({ status: 400, description: 'Invalid delivery challan ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Delivery challan not found' })
  async downloadPDF(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const challan = await this.deliveryChallansService.findOne(id);

    // Mark challan as printed
    await this.deliveryChallansService.markAsPrinted(id);

    // If PDF is already in S3, redirect to S3 URL
    if (challan.pdfURLPath) {
      res.redirect(challan.pdfURLPath);
      return;
    }

    // Fallback: Generate PDF on-the-fly if not in S3
    // Determine order reference based on which order type this challan belongs to
    let orderReference = 'N/A';
    if (challan.bankOrderId) {
      const bankOrder = challan.bankOrderId as any;
      orderReference = bankOrder.refNo || 'N/A';
    } else if (challan.bipOrderId) {
      const bipOrder = challan.bipOrderId as any;
      orderReference = bipOrder.eforms || 'N/A';
    }

    // Prepare PDF data
    const pdfData: DeliveryChallanPDFData = {
      challanNumber: challan.challanNumber,
      challanDate: challan.challanDate,
      customerName: challan.customerName,
      customerCnic: challan.customerCnic,
      customerPhone: challan.customerPhone,
      customerAddress: challan.customerAddress,
      customerCity: challan.customerCity,
      productName: challan.productName,
      productBrand: challan.productBrand,
      serialNumber: challan.productSerialNumber,
      quantity: challan.quantity,
      trackingNumber: challan.trackingNumber,
      consignmentNumber: challan.consignmentNumber,
      courierName: challan.courierName,
      dispatchDate: challan.dispatchDate,
      expectedDeliveryDate: challan.expectedDeliveryDate,
      orderReference,
      remarks: challan.remarks,
    };

    // Generate PDF
    const pdfBuffer = await generateDeliveryChallanPDF(pdfData);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${challan.challanNumber}.pdf"`,
    );
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF
    res.status(HttpStatus.OK).send(pdfBuffer);
  }
}
