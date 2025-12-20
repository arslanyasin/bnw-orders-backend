import { IsArray, IsNotEmpty, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CombinePreviewDto {
  @ApiProperty({
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    description: 'Array of Purchase Order IDs to combine',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(2, { message: 'At least 2 POs are required to combine' })
  @IsNotEmpty({ each: true })
  poIds: string[];
}
