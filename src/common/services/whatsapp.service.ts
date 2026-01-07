import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import axios from 'axios';
import { TheWhatBotContactDto, TheWhatBotResponse } from '@common/dto/thewhatbot-api.dto';
import { SendWhatsAppMessageDto } from '@common/dto/send-whatsapp-message.dto';

export interface WhatsAppMessagePayload {
  phoneNumber: string;
  customerName: string;
  orderReference: string;
  product: string;
  quantity: number;
  confirmationToken: string;
  confirmationUrl: string;
  cancellationUrl: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly whatsappApiUrl = process.env.WHATSAPP_API_URL || 'https://api.whatsapp.com/send';
  private readonly whatsappApiToken = process.env.WHATSAPP_API_TOKEN || '';
  private readonly webhookBaseUrl = process.env.WEBHOOK_BASE_URL || 'http://localhost:3000';

  // TheWhatBot API configuration
  private readonly theWhatBotApiUrl = 'https://app.thewhatbot.com/api/contacts';
  private readonly theWhatBotAccessToken: string;
  private readonly whatsappFlowId: string;

  constructor(private configService: ConfigService) {
    this.theWhatBotAccessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN') || '';
    this.whatsappFlowId = this.configService.get<string>('WHATSAPP_FLOW_ID') || '';
  }

  /**
   * Generate a unique confirmation token for an order
   */
  generateConfirmationToken(orderId: string, orderType: 'bank' | 'bip'): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    return `whatsapp_${orderType}_${orderId}_${timestamp}_${random}`;
  }

  /**
   * Send WhatsApp confirmation message to customer
   * This is a placeholder - you'll need to integrate with your actual WhatsApp Business API
   */
  async sendConfirmationMessage(payload: WhatsAppMessagePayload): Promise<boolean> {
    try {
      this.logger.log(`Sending WhatsApp confirmation to ${payload.phoneNumber}`);

      const message = this.buildConfirmationMessage(payload);

      // TODO: Replace with actual WhatsApp Business API call
      // Example using WhatsApp Cloud API:
      // const response = await fetch(`${this.whatsappApiUrl}/messages`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${this.whatsappApiToken}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     messaging_product: 'whatsapp',
      //     to: payload.phoneNumber,
      //     type: 'text',
      //     text: { body: message },
      //   }),
      // });

      // For now, just log the message
      this.logger.log(`WhatsApp Message:\n${message}`);
      this.logger.log(`Confirmation URL: ${payload.confirmationUrl}`);
      this.logger.log(`Cancellation URL: ${payload.cancellationUrl}`);

      // Simulate successful send
      return true;
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message: ${error.message}`);
      return false;
    }
  }

  /**
   * Build the confirmation message template
   */
  private buildConfirmationMessage(payload: WhatsAppMessagePayload): string {
    return `
Hello ${payload.customerName},

Your order has been received!

Order Reference: ${payload.orderReference}
Product: ${payload.product}
Quantity: ${payload.quantity}

Please confirm your order by clicking the link below:
✅ Confirm Order: ${payload.confirmationUrl}

To cancel this order, click here:
❌ Cancel Order: ${payload.cancellationUrl}

Thank you for your order!
BNW Collections
    `.trim();
  }

  /**
   * Build confirmation URL for customer
   */
  buildConfirmationUrl(confirmationToken: string): string {
    return `${this.webhookBaseUrl}/api/v1/webhooks/whatsapp/confirm?token=${confirmationToken}&status=confirmed`;
  }

  /**
   * Build cancellation URL for customer
   */
  buildCancellationUrl(confirmationToken: string): string {
    return `${this.webhookBaseUrl}/api/v1/webhooks/whatsapp/confirm?token=${confirmationToken}&status=cancelled`;
  }

  /**
   * Send WhatsApp message via TheWhatBot API
   * Accepts data in SendWhatsAppMessageDto format and transforms to TheWhatBot format
   */
  async sendWhatsAppViaTheWhatBot(data: SendWhatsAppMessageDto): Promise<TheWhatBotResponse> {
    try {
      this.logger.log(`Sending WhatsApp message via TheWhatBot to ${data.phone}`);

      // Validate configuration
      if (!this.theWhatBotAccessToken) {
        throw new InternalServerErrorException('WhatsApp access token not configured');
      }

      if (!this.whatsappFlowId) {
        throw new InternalServerErrorException('WhatsApp flow ID not configured');
      }

      // Build the request body according to TheWhatBot API format
      const requestBody: TheWhatBotContactDto = {
        phone: data.phone,
        email: '',
        first_name: data.customerName,
        last_name: '',
        actions: [
          {
            action: 'set_field_value',
            field_name: 'order_main_id',
            value: data.orderNumber,
          },
          {
            action: 'set_field_value',
            field_name: 'full_name',
            value: data.customerName,
          },
          {
            action: 'set_field_value',
            field_name: 'order items',
            value: data.product,
          },
          {
            action: 'set_field_value',
            field_name: 'order total amount',
            value: data.orderPrice.toLocaleString('en-US'),
          },
          {
            action: 'set_field_value',
            field_name: 'order delivery address',
            value: data.address,
          },
          {
            action: 'send_flow',
            flow_id: this.whatsappFlowId,
          },
        ],
      };

      // Make API call to TheWhatBot
      const response = await axios.post<TheWhatBotResponse>(
        this.theWhatBotApiUrl,
        requestBody,
        {
          headers: {
            'X-ACCESS-TOKEN': this.theWhatBotAccessToken,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 seconds timeout
        },
      );

      this.logger.log(`WhatsApp message sent successfully to ${data.phone}`);

      return {
        success: true,
        message: 'WhatsApp message sent successfully',
        data: response.data,
      };
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message via TheWhatBot: ${error.message}`);

      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const errorMessage = error.response?.data?.message || error.message;

        this.logger.error(`TheWhatBot API Error - Status: ${statusCode}, Message: ${errorMessage}`);

        return {
          success: false,
          message: `Failed to send WhatsApp message: ${errorMessage}`,
          data: error.response?.data,
        };
      }

      return {
        success: false,
        message: `Failed to send WhatsApp message: ${error.message}`,
      };
    }
  }

  /**
   * Send WhatsApp message via TheWhatBot API (Direct format)
   * Accepts data directly in TheWhatBot format from frontend
   */
  async sendWhatsAppDirectFormat(data: TheWhatBotContactDto): Promise<TheWhatBotResponse> {
    try {
      this.logger.log(`Sending WhatsApp message via TheWhatBot to ${data.phone}`);

      // Validate configuration
      if (!this.theWhatBotAccessToken) {
        throw new InternalServerErrorException('WhatsApp access token not configured');
      }

      // Make API call to TheWhatBot
      const response = await axios.post<TheWhatBotResponse>(
        this.theWhatBotApiUrl,
        data,
        {
          headers: {
            'X-ACCESS-TOKEN': this.theWhatBotAccessToken,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 seconds timeout
        },
      );

      this.logger.log(`WhatsApp message sent successfully to ${data.phone}`);

      return {
        success: true,
        message: 'WhatsApp message sent successfully',
        data: response.data,
      };
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message via TheWhatBot: ${error.message}`);

      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const errorMessage = error.response?.data?.message || error.message;

        this.logger.error(`TheWhatBot API Error - Status: ${statusCode}, Message: ${errorMessage}`);

        return {
          success: false,
          message: `Failed to send WhatsApp message: ${errorMessage}`,
          data: error.response?.data,
        };
      }

      return {
        success: false,
        message: `Failed to send WhatsApp message: ${error.message}`,
      };
    }
  }
}
