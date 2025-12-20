import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { Courier } from '@modules/couriers/schemas/courier.schema';

export interface LeopardsBookingRequest {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  productDescription: string;
  quantity: number;
  declaredValue?: number;
  specialInstructions?: string;
  referenceNumber?: string; // Order reference number
}

export interface LeopardsBookingResponse {
  success: boolean;
  trackingNumber?: string;
  consignmentNumber?: string;
  message?: string;
  error?: string;
  rawResponse?: any;
}

export interface LeopardsTrackingResponse {
  success: boolean;
  status?: string;
  currentLocation?: string;
  lastUpdate?: Date;
  deliveryDate?: Date;
  remarks?: string;
  error?: string;
  rawResponse?: any;
}

@Injectable()
export class LeopardsService {
  private readonly logger = new Logger(LeopardsService.name);
  private axiosInstance: AxiosInstance;

  constructor() {
    // Initialize axios instance with default config
    this.axiosInstance = axios.create({
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private configureAxios(courier: Courier): void {
    if (!courier.apiUrl) {
      throw new BadRequestException(
        'Leopards API URL not configured for this courier',
      );
    }

    this.axiosInstance.defaults.baseURL = courier.apiUrl;

    // Configure authentication headers
    if (courier.apiKey) {
      this.axiosInstance.defaults.headers.common['X-API-Key'] =
        courier.apiKey;
    }

    if (courier.apiSecret) {
      this.axiosInstance.defaults.headers.common['X-API-Secret'] =
        courier.apiSecret;
    }
  }

  async bookShipment(
    courier: Courier,
    bookingData: LeopardsBookingRequest,
  ): Promise<LeopardsBookingResponse> {
    this.configureAxios(courier);

    try {
      this.logger.log(
        `Booking shipment with Leopards for customer: ${bookingData.customerName}`,
      );

      // Prepare booking payload according to Leopards API specification
      const payload = {
        consignee_name: bookingData.customerName,
        consignee_phone: bookingData.customerPhone,
        consignee_address: bookingData.customerAddress,
        consignee_city: bookingData.customerCity,
        product_description: bookingData.productDescription,
        pieces: bookingData.quantity,
        cod_amount: bookingData.declaredValue || 0,
        special_instructions: bookingData.specialInstructions || '',
        reference_number: bookingData.referenceNumber || '',
      };

      // Make API call to Leopards booking endpoint
      // Note: Replace '/api/book-packet' with actual Leopards API endpoint
      const response = await this.axiosInstance.post(
        '/api/book-packet',
        payload,
      );

      this.logger.log(`Leopards API Response: ${JSON.stringify(response.data)}`);

      // Parse Leopards API response
      // Note: Adjust parsing based on actual Leopards API response format
      if (response.data && response.data.status === 'success') {
        return {
          success: true,
          trackingNumber: response.data.tracking_number || response.data.cn_number,
          consignmentNumber: response.data.cn_number,
          message: response.data.message || 'Shipment booked successfully',
          rawResponse: response.data,
        };
      } else {
        return {
          success: false,
          error:
            response.data?.message ||
            response.data?.error ||
            'Failed to book shipment',
          rawResponse: response.data,
        };
      }
    } catch (error) {
      this.logger.error(
        `Error booking shipment with Leopards: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Unknown error occurred',
        rawResponse: error.response?.data,
      };
    }
  }

  async trackShipment(
    courier: Courier,
    trackingNumber: string,
  ): Promise<LeopardsTrackingResponse> {
    this.configureAxios(courier);

    try {
      this.logger.log(`Tracking shipment with Leopards: ${trackingNumber}`);

      // Make API call to Leopards tracking endpoint
      // Note: Replace '/api/track' with actual Leopards API endpoint
      const response = await this.axiosInstance.get('/api/track', {
        params: {
          tracking_number: trackingNumber,
        },
      });

      this.logger.log(`Leopards Tracking Response: ${JSON.stringify(response.data)}`);

      // Parse Leopards tracking response
      // Note: Adjust parsing based on actual Leopards API response format
      if (response.data && response.data.status === 'success') {
        return {
          success: true,
          status: response.data.shipment_status,
          currentLocation: response.data.current_location,
          lastUpdate: response.data.last_update
            ? new Date(response.data.last_update)
            : undefined,
          deliveryDate: response.data.delivery_date
            ? new Date(response.data.delivery_date)
            : undefined,
          remarks: response.data.remarks,
          rawResponse: response.data,
        };
      } else {
        return {
          success: false,
          error:
            response.data?.message ||
            response.data?.error ||
            'Failed to track shipment',
          rawResponse: response.data,
        };
      }
    } catch (error) {
      this.logger.error(
        `Error tracking shipment with Leopards: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Unknown error occurred',
        rawResponse: error.response?.data,
      };
    }
  }

  async cancelShipment(
    courier: Courier,
    trackingNumber: string,
    reason?: string,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    this.configureAxios(courier);

    try {
      this.logger.log(`Cancelling shipment with Leopards: ${trackingNumber}`);

      const payload = {
        tracking_number: trackingNumber,
        cancel_reason: reason || 'Cancelled by customer',
      };

      // Make API call to Leopards cancellation endpoint
      // Note: Replace '/api/cancel' with actual Leopards API endpoint
      const response = await this.axiosInstance.post('/api/cancel', payload);

      this.logger.log(`Leopards Cancel Response: ${JSON.stringify(response.data)}`);

      if (response.data && response.data.status === 'success') {
        return {
          success: true,
          message: response.data.message || 'Shipment cancelled successfully',
        };
      } else {
        return {
          success: false,
          error:
            response.data?.message ||
            response.data?.error ||
            'Failed to cancel shipment',
        };
      }
    } catch (error) {
      this.logger.error(
        `Error cancelling shipment with Leopards: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Unknown error occurred',
      };
    }
  }
}
