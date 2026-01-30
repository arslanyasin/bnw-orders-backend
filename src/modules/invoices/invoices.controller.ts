import {
  Controller,
  Post,
  Body,
  UseGuards,
  Res,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@common/interfaces/user-role.enum';

@ApiTags('Invoices')
@ApiBearerAuth('JWT-auth')
@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post('generate')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: 'Generate invoice for dispatched orders by bank and date range (Admin/Staff only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice Excel file generated and downloaded',
  })
  @ApiResponse({
    status: 404,
    description: 'Bank not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async generateInvoice(
    @Body() generateInvoiceDto: GenerateInvoiceDto,
    @Res() res: Response,
  ) {
    const buffer = await this.invoicesService.generateInvoice(
      generateInvoiceDto.bankId,
      generateInvoiceDto.startDate,
      generateInvoiceDto.endDate,
      generateInvoiceDto.orderType,
    );

    // Set response headers for file download
    const orderTypeLabel = generateInvoiceDto.orderType === 'bank_orders' ? 'BankOrders' : 'BIPOrders';
    const filename = `Invoice_${orderTypeLabel}_${generateInvoiceDto.startDate}_to_${generateInvoiceDto.endDate}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);

    res.status(HttpStatus.OK).send(buffer);
  }
}
