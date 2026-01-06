import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { Courier } from '@modules/couriers/schemas/courier.schema';

export interface TcsBookingRequest {
  customerName: string;
  customerCnic: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  productDescription: string;
  quantity: number;
  declaredValue?: number;
  specialInstructions?: string;
  referenceNumber?: string;
  customerEmail?: string;
  weightInKg?: number;
  fragile?: boolean;
  landmark?: string;
  length?: number;
  width?: number;
  height?: number;
}

export interface TcsBookingResponse {
  success: boolean;
  trackingNumber?: string;
  consignmentNumber?: string;
  message?: string;
  error?: string;
  rawResponse?: any;
}

export interface TcsTrackingResponse {
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
export class TcsService {
  private readonly logger = new Logger(TcsService.name);
  private axiosInstance: AxiosInstance;
  private readonly TCS_BASE_URL = 'https://ociconnect.tcscourier.com/ecom/api';
  private tokenCache: { token: string; expiry: Date } | null = null;

  constructor(private configService: ConfigService) {
    this.axiosInstance = axios.create({
      baseURL: this.TCS_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private validateNamePart(
    name: string,
    fieldName: string,
    fallbackValue?: string,
  ): string {
    const trimmedName = name.trim();

    // If name is too long, truncate to 50 characters
    if (trimmedName.length > 50) {
      this.logger.warn(
        `${fieldName} "${trimmedName}" exceeds 50 characters, truncating to 50`,
      );
      return trimmedName.substring(0, 50);
    }

    // If name is too short (less than 3 characters)
    if (trimmedName.length < 3) {
      // If no name or too short, use fallback or pad with spaces
      if (fallbackValue && fallbackValue.length >= 3) {
        this.logger.warn(
          `${fieldName} "${trimmedName}" is less than 3 characters, using "${fallbackValue}" as fallback`,
        );
        return fallbackValue.substring(0, 50); // Ensure fallback is also within limit
      }

      // If no valid fallback, pad the name to meet minimum 3 characters
      const paddedName = trimmedName.padEnd(3, 'x');
      this.logger.warn(
        `${fieldName} "${trimmedName}" is less than 3 characters, padding to "${paddedName}"`,
      );
      return paddedName;
    }

    return trimmedName;
  }

  private async getAccessToken(courier: Courier): Promise<string> {
    // Check if we have a valid cached token
    if (this.tokenCache && new Date() < this.tokenCache.expiry) {
      this.logger.log('Using cached TCS access token');
      return this.tokenCache.token;
    }

    // Validate TCS credentials are configured
    if (!courier.apiKey || !courier.apiSecret) {
      throw new BadRequestException(
        'TCS credentials not configured. Please add username in apiKey and password in apiSecret fields.',
      );
    }

    try {
      this.logger.log('Fetching new access token from TCS API');

      // Get Bearer token from configuration
      const bearerToken = this.configService.get<string>('tcs.bearerToken');

      if (!bearerToken) {
        throw new BadRequestException(
          'TCS_BEARER_TOKEN not configured in environment variables',
        );
      }
      this.logger.log(bearerToken);

      // Use Bearer token to get access token
      const response = await this.axiosInstance.get(
        `/authentication/token?username=${courier.apiKey}&password=${courier.apiSecret}`,
        {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
        },
      );

      this.logger.log('Successfully received access token from TCS');

      const authData = response.data;

      // Cache the access token with expiry
      this.tokenCache = {
        token: authData.accesstoken,
        expiry: new Date(authData.expiry),
      };
      this.logger.log('Successfully received access token from TCS', this.tokenCache);

      return authData.accesstoken;
    } catch (error) {
      this.logger.error(
        `Failed to get access token from TCS: ${error.message}`,
        error.stack,
      );

      if (error.response) {
        this.logger.error(
          `TCS Auth API Response: ${JSON.stringify(error.response.data)}`,
        );
      }

      throw new UnauthorizedException(
        `Failed to authenticate with TCS: ${error.message}`,
      );
    }
  }

  async bookShipment(
    courier: Courier,
    bookingData: TcsBookingRequest,
  ): Promise<TcsBookingResponse> {
    try {
      this.logger.log(`Booking TCS shipment for customer: ${bookingData.customerName}`);
      const bearerToken = this.configService.get<string>('tcs.bearerToken');

      if (!bearerToken) {
        throw new BadRequestException(
          'TCS_BEARER_TOKEN not configured in environment variables',
        );
      }
      // Get access token using Bearer token
      const accessToken = await this.getAccessToken(courier);

      // Parse customer name into parts and validate length requirements
      const nameParts = bookingData.customerName.trim().split(' ');
      let firstname = nameParts[0] || '';
      let lastname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
      let middlename = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';

      // Validate and adjust name parts to meet TCS requirements (3-50 characters)
      firstname = this.validateNamePart(firstname, 'firstname');
      lastname = this.validateNamePart(lastname, 'lastname', firstname);

      // Middlename is optional, but if present must be 3-50 chars
      if (middlename && middlename.length > 0) {
        middlename = this.validateNamePart(middlename, 'middlename');
      }

      // Prepare TCS booking payload with all customer details
      const tcsPayload = {
        accesstoken: accessToken, // Include access token in payload
        consignmentno: '', // TCS will generate this
        shipperinfo: {
          tcsaccount: courier.apiSecret || '', // TCS account number from apiSecret
          shippername: 'Bank Order Processing System',
          address1: 'Head Office',
          address2: '',
          address3: '',
          zip: '75800',
          countrycode: 'PK',
          countryname: 'Pakistan',
          citycode: 'KHI',
          cityname: 'Karachi',
          mobile: courier.contactPhone || '03001234567',
        },
        consigneeinfo: {
          consigneecode: `C${Date.now().toString().slice(-6)}`, // Generate unique code
          firstname,
          middlename,
          lastname,
          address1: bookingData.customerAddress,
          address2: '',
          address3: '',
          zip: '00000',
          countrycode: 'PK',
          countryname: 'Pakistan',
          citycode: this.getCityCode(bookingData.customerCity),
          cityname: bookingData.customerCity,
          email: bookingData.customerEmail || 'customer@example.com',
          areacode: '',
          areaname: '',
          blockcode: '',
          blockname: '',
          lat: '',
          lng: '',
          landmark: bookingData.landmark || '',
          mobile: bookingData.customerPhone,
          consigneecnic: bookingData.customerCnic || '',
        },
        vendorinfo: {
          name: 'Bank Order Processing',
          address1: 'Warehouse',
          address2: '',
          address3: '',
          citycode: 'KHI',
          cityname: 'Karachi',
          mobile: courier.contactPhone || '03004456108',
        },
        shipmentinfo: {
          costcentercode: 'Test-01',
          referenceno: bookingData.referenceNumber || '',
          contentdesc: bookingData.productDescription,
          servicecode: 'O', // O for Overnight
          parametertype: '',
          shipmentdate: new Date().toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          }),
          shippingtype: '',
          currency: 'PKR',
          codamount: bookingData.declaredValue || 0,
          declaredvalue: 10,
          insuredvalue: 10,
          transactiontype: '',
          dsflag: '',
          carrierslug: '',
          weightinkg: bookingData.weightInKg || 0.5,
          pieces: bookingData.quantity,
          fragile: bookingData.fragile || false,
          remarks: bookingData.specialInstructions || '',
          skus: [
            {
              description: bookingData.productDescription,
              quantity: bookingData.quantity,
              weight: bookingData.weightInKg || 0.5,
              uom: 'KG',
              unitprice: bookingData.declaredValue || 0,
              declaredvalue: 10,
              insuredvalue: 10,
              hscode: '',
            },
          ],
          piecedetail: [
            {
              length: bookingData.length || 10,
              width: bookingData.width || 10,
              height: bookingData.height || 10,
            },
          ],
          vas: '',
        },
      };

      this.logger.log('Sending booking request to TCS API', JSON.stringify(tcsPayload));

      // Make API call to TCS booking endpoint (access token is in payload)
      const response = await this.axiosInstance.post('/booking/create', tcsPayload, {
        headers: {
          Authorization: 'Bearer ' + bearerToken,
        },
      });

      this.logger.log(`TCS API Response: ${JSON.stringify(response.data)}`);

      // Parse TCS response
      if (response.data && response.data.consignmentNo) {
        return {
          success: true,
          trackingNumber: response.data.traceid,
          consignmentNumber: response.data.consignmentNo,
          message: response.data.message || 'Shipment booked successfully',
          rawResponse: response.data,
        };
      } else {
        // Handle error response
        const errorMsg = response.data?.message || 'Failed to book shipment';
        return {
          success: false,
          error: errorMsg,
          rawResponse: response.data,
        };
      }
    } catch (error) {
      this.logger.error(`Error booking shipment with TCS: ${error.message}`, error.stack);

      // Handle specific error responses
      if (error.response?.data) {
        const errorData = error.response.data;

        // Check for 401 unauthorized
        if (errorData.code === 401) {
          return {
            success: false,
            error: errorData.message || 'Invalid bearer token',
            rawResponse: errorData,
          };
        }

        // Check for error array
        if (errorData.error && Array.isArray(errorData.error)) {
          const errors = errorData.error
            .map((e: any) => Object.values(e).join(': '))
            .join(', ');
          return {
            success: false,
            error: `${errorData.message}: ${errors}`,
            rawResponse: errorData,
          };
        }

        return {
          success: false,
          error: errorData.message || 'Unknown error occurred',
          rawResponse: errorData,
        };
      }

      return {
        success: false,
        error: error.message || 'Unknown error occurred',
        rawResponse: error.response?.data,
      };
    }
  }

  async trackShipment(
    courier: Courier,
    trackingNumber: string,
  ): Promise<TcsTrackingResponse> {
    this.logger.warn('TCS tracking API not yet implemented');

    // TODO: Implement TCS tracking API
    // Will need to get the tracking endpoint from TCS documentation

    return {
      success: false,
      error: 'TCS tracking API not yet implemented',
    };
  }

  async cancelShipment(
    courier: Courier,
    trackingNumber: string,
    reason?: string,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    this.logger.warn('TCS cancellation API not yet implemented');

    // TODO: Implement TCS cancellation API
    // Will need to get the cancellation endpoint from TCS documentation

    return {
      success: false,
      error: 'TCS cancellation API not yet implemented',
    };
  }

  private getCityCode(cityName: string): string {
    // Map common city names to TCS city codes
    const cityCodeMap: Record<string, string> = {
      karachi: 'KHI',
      lahore: 'LHE',
      islamabad: 'ISB',
      rawalpindi: 'RWP',
      faisalabad: 'LYP',
      multan: 'MUX',
      peshawar: 'PEW',
      quetta: 'UET',
      sialkot: 'SKT',
      gujranwala: 'GRW',
      hyderabad: 'HDD',
      sukkur: 'SKZ',
    };

    const normalized = cityName.toLowerCase().trim();
    return cityCodeMap[normalized] || 'KHI'; // Default to Karachi
  }
}
