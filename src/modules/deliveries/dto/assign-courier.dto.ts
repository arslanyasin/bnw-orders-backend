import { IsMongoId, IsNotEmpty, IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CourierCompany } from '../schemas/delivery.schema';

export class AssignCourierDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Bank Order MongoDB ObjectId',
  })
  @IsMongoId({ message: 'Invalid bank order ID format' })
  @IsNotEmpty()
  bankOrderId: string;

  @ApiProperty({
    enum: CourierCompany,
    example: CourierCompany.TCS,
    description: 'Courier company name',
  })
  @IsEnum(CourierCompany, { message: 'Invalid courier company' })
  @IsNotEmpty()
  courierCompany: CourierCompany;

  @ApiProperty({
    example: 'TCS123456789',
    description: 'Courier tracking number (optional)',
    required: false,
  })
  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Dispatch date (optional)',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  dispatchDate?: string;
}
