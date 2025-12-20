import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsEmail,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CourierType } from '@common/enums/courier-type.enum';

export class CreateCourierDto {
  @ApiProperty({ example: 'Leopards Courier', description: 'Courier company name' })
  @IsString()
  @IsNotEmpty()
  courierName: string;

  @ApiProperty({
    example: 'leopards',
    description: 'Courier type',
    enum: CourierType,
    enumName: 'CourierType',
  })
  @IsEnum(CourierType, {
    message: 'Courier type must be one of: leopards, tcs, tcs_overland',
  })
  @IsNotEmpty()
  courierType: CourierType;

  @ApiProperty({ example: 'https://api.leopardscourier.com', description: 'API base URL', required: false })
  @IsString()
  @IsOptional()
  apiUrl?: string;

  @ApiProperty({ example: 'api_key_123456', description: 'API key for authentication', required: false })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiProperty({ example: 'api_secret_123456', description: 'API secret for authentication', required: false })
  @IsString()
  @IsOptional()
  apiSecret?: string;

  @ApiProperty({ example: '+92-321-1234567', description: 'Contact phone number', required: false })
  @IsString()
  @IsOptional()
  contactPhone?: string;

  @ApiProperty({ example: 'contact@leopardscourier.com', description: 'Contact email', required: false })
  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @ApiProperty({ example: true, description: 'Whether this courier is active', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether this courier requires manual dispatch (true for TCS Overland, false for API-based couriers)',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isManualDispatch?: boolean;
}
