import { IsArray, IsNotEmpty, ArrayMinSize, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MergePOsDto {
  @ApiProperty({
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    description: 'Array of Purchase Order IDs to merge',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(2, { message: 'At least 2 POs are required to merge' })
  @IsNotEmpty({ each: true })
  poIds: string[];

  @ApiProperty({
    example: 'PO-2024-0050',
    description: 'Custom PO number for merged PO (optional, will auto-generate if not provided)',
    required: false,
  })
  @IsOptional()
  @IsString()
  newPoNumber?: string;
}
