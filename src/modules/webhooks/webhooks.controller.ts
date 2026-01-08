import {
  Controller,
  Post,
  Get,
  Query,
  Body,
  UseGuards,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { WebhookAuthGuard } from '@common/guards/webhook-auth.guard';
import { WhatsAppWebhookDto, OrderConfirmationStatus } from '@common/dto/whatsapp-webhook.dto';
import { SimpleWhatsAppWebhookDto } from '@common/dto/simple-whatsapp-webhook.dto';
import { CheckOrderStatusDto } from '@common/dto/check-order-status.dto';
import { BankOrdersService } from '@modules/bank-orders/bank-orders.service';
import { BipService } from '@modules/bip/bip.service';

@ApiTags('Webhooks')
@Controller({ path: 'webhooks', version: '1' })
export class WebhooksController {
  constructor(
    private readonly bankOrdersService: BankOrdersService,
    private readonly bipService: BipService,
  ) {}

  /**
   * Public webhook endpoint for WhatsApp order confirmations (GET for customer clicks)
   * Uses token-based verification instead of JWT authentication
   */
  @Public()
  @Get('whatsapp/confirm')
  @ApiOperation({ summary: 'WhatsApp order confirmation webhook (public, token-secured)' })
  @ApiQuery({
    name: 'token',
    required: true,
    type: String,
    description: 'Unique confirmation token',
    example: 'whatsapp_bank_123abc456def_1234567890_abc123',
  })
  @ApiQuery({
    name: 'status',
    required: true,
    enum: OrderConfirmationStatus,
    description: 'Confirmation status (confirmed or cancelled)',
    example: 'confirmed',
  })
  @ApiResponse({
    status: 200,
    description: 'Order confirmation processed successfully',
    schema: {
      example: {
        success: true,
        message: 'Order confirmed successfully',
        order: {
          refNo: 'REF-2024-001',
          customerName: 'John Doe',
          product: 'Samsung Galaxy S24',
          status: 'confirmed',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Order not found or invalid token' })
  async confirmOrderGet(
    @Query('token') token: string,
    @Query('status') status: OrderConfirmationStatus,
    @Res() res: Response,
  ): Promise<void> {
    try {
      // Extract order ID and type from token
      // Token format: whatsapp_{orderType}_{orderId}_{timestamp}_{random}
      const tokenParts = token.split('_');
      const orderType = tokenParts[1]; // 'bank' or 'bip'
      const orderId = tokenParts[2]; // order ID

      let result;
      if (orderType === 'bank') {
        result = await this.bankOrdersService.processWhatsAppConfirmation(orderId, token, status);
      } else {
        result = await this.bipService.processWhatsAppConfirmation(orderId, token, status);
      }

      // Return HTML response for better user experience
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Order ${status === 'confirmed' ? 'Confirmed' : 'Cancelled'}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              text-align: center;
              max-width: 500px;
            }
            .icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 {
              color: #333;
              margin-bottom: 10px;
            }
            p {
              color: #666;
              margin-bottom: 20px;
            }
            .order-details {
              background: #f5f5f5;
              padding: 20px;
              border-radius: 5px;
              margin-top: 20px;
              text-align: left;
            }
            .order-details p {
              margin: 5px 0;
              color: #333;
            }
            .label {
              font-weight: bold;
              display: inline-block;
              width: 120px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">${result.success ? (status === 'confirmed' ? '✅' : '❌') : '⚠️'}</div>
            <h1>${result.message}</h1>
            ${result.order ? `
              <div class="order-details">
                <p><span class="label">Customer:</span> ${result.order.customerName || 'N/A'}</p>
                <p><span class="label">Reference:</span> ${result.order.refNo || result.order.eforms || 'N/A'}</p>
                <p><span class="label">Product:</span> ${result.order.product || 'N/A'}</p>
                <p><span class="label">Status:</span> ${result.order.status || 'N/A'}</p>
              </div>
            ` : ''}
            <p style="margin-top: 20px; font-size: 12px; color: #999;">You can close this window now.</p>
          </div>
        </body>
        </html>
      `;

      res.status(HttpStatus.OK).send(html);
    } catch (error) {
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              text-align: center;
              max-width: 500px;
            }
            .icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 {
              color: #333;
              margin-bottom: 10px;
            }
            p {
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">⛔</div>
            <h1>Error</h1>
            <p>${error.message || 'An error occurred while processing your request.'}</p>
          </div>
        </body>
        </html>
      `;

      res.status(HttpStatus.BAD_REQUEST).send(errorHtml);
    }
  }

  /**
   * Public webhook endpoint for WhatsApp order confirmations (POST for programmatic calls)
   * Uses WebhookAuthGuard for signature/token verification
   */
  @Public()
  @Post('whatsapp/order-confirmation')
  @UseGuards(WebhookAuthGuard)
  @ApiOperation({ summary: 'WhatsApp order confirmation webhook (public, secret key secured)' })
  @ApiResponse({
    status: 200,
    description: 'Order confirmation processed successfully',
    schema: {
      example: {
        success: true,
        message: 'Order confirmed successfully',
        order: {
          orderId: '507f1f77bcf86cd799439011',
          refNo: 'REF-2024-001',
          customerName: 'John Doe',
          product: 'Samsung Galaxy S24',
          status: 'confirmed',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid webhook secret' })
  @ApiResponse({ status: 404, description: 'Order not found or invalid order ID/token combination' })
  async confirmOrderPost(@Body() webhookDto: WhatsAppWebhookDto) {
    try {
      let result;
      if (webhookDto.orderType === 'bank') {
        result = await this.bankOrdersService.processWhatsAppConfirmation(
          webhookDto.orderId,
          webhookDto.confirmationToken,
          webhookDto.status,
        );
      } else {
        result = await this.bipService.processWhatsAppConfirmation(
          webhookDto.orderId,
          webhookDto.confirmationToken,
          webhookDto.status,
        );
      }

      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to process confirmation',
      };
    }
  }

  /**
   * Simple webhook endpoint - only PO number and status required
   * Searches in both bank orders and BIP orders automatically
   */
  @Public()
  @Post('whatsapp/confirm-order')
  @UseGuards(WebhookAuthGuard)
  @ApiOperation({ summary: 'Simple WhatsApp order confirmation webhook - PO number + status only' })
  @ApiResponse({
    status: 200,
    description: 'Order confirmation processed successfully',
    schema: {
      example: {
        success: true,
        message: 'Order confirmed successfully',
        order: {
          orderId: '507f1f77bcf86cd799439011',
          poNumber: 'REF-2024-001',
          customerName: 'John Doe',
          product: 'Samsung Galaxy S24',
          status: 'confirmed',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid webhook secret' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async confirmOrderSimple(@Body() webhookDto: SimpleWhatsAppWebhookDto) {
    // Try to find and update in bank orders first
    const bankResult = await this.bankOrdersService.updateOrderByPONumber(
      webhookDto.poNumber,
      webhookDto.status,
    );

    if (bankResult.success) {
      return bankResult;
    }

    // If not found in bank orders, try BIP orders
    const bipResult = await this.bipService.updateOrderByPONumber(
      webhookDto.poNumber,
      webhookDto.status,
    );

    if (bipResult.success) {
      return bipResult;
    }

    // Not found in either table
    return {
      success: false,
      message: `Order with PO number ${webhookDto.poNumber} not found in bank orders or BIP orders`,
    };
  }

  /**
   * Public endpoint to check order status by PO number and CNIC
   * Searches both bank orders and BIP orders
   */
  @Public()
  @Post('order-status/check')
  @ApiOperation({ summary: 'Check order status by PO number and CNIC (public endpoint)' })
  @ApiResponse({
    status: 200,
    description: 'Order status retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Order found',
        order: {
          poNumber: 'REF-2024-001',
          orderDate: '2024-01-15T10:30:00.000Z',
          customerName: 'John Doe',
          product: 'Samsung Galaxy S24',
          brand: 'Samsung',
          quantity: 1,
          status: 'dispatched',
          address: '123 Main Street, Apartment 4B',
          city: 'Karachi',
          mobile: '03001234567',
          shipment: {
            trackingNumber: 'TRK123456789',
            consignmentNumber: 'CN987654321',
            courierName: 'TCS Overland',
            status: 'in_transit',
            estimatedDeliveryDate: '2024-01-20T00:00:00.000Z',
            actualDeliveryDate: null,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found with the provided PO number and CNIC',
    schema: {
      example: {
        success: false,
        message: 'Order not found with the provided PO number and CNIC',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data - PO number and CNIC are required',
  })
  async checkOrderStatus(@Body() checkOrderStatusDto: CheckOrderStatusDto) {
    // Try to find in bank orders first (using poNumber)
    const bankResult = await this.bankOrdersService.checkOrderStatusByPOAndCNIC(
      checkOrderStatusDto.poNumber,
      checkOrderStatusDto.cnic,
    );

    if (bankResult.success) {
      return bankResult;
    }

    // If not found in bank orders, try BIP orders (using poNumber)
    const bipResult = await this.bipService.checkOrderStatusByPOAndCNIC(
      checkOrderStatusDto.poNumber,
      checkOrderStatusDto.cnic,
    );

    if (bipResult.success) {
      return bipResult;
    }

    // Not found in either table
    return {
      success: false,
      message: 'Order not found with the provided PO number and CNIC',
    };
  }
}
