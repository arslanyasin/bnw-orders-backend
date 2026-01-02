import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDeliveryChallanDto {
  @ApiProperty({
    example: 'SN123456789',
    description: 'Optional manual override for product serial number',
    required: false,
  })
  @IsOptional()
  @IsString()
  productSerialNumber?: string;

  @ApiProperty({
    example: 'Handle with care',
    description: 'Additional remarks for the delivery challan',
    required: false,
  })
  @IsOptional()
  @IsString()
  remarks?: string;
}
