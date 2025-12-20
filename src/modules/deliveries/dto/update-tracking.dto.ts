import { IsNotEmpty, IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTrackingDto {
  @ApiProperty({
    example: 'TCS123456789',
    description: 'Courier tracking number',
  })
  @IsString()
  @IsNotEmpty()
  trackingNumber: string;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Dispatch date (optional)',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  dispatchDate?: string;
}
