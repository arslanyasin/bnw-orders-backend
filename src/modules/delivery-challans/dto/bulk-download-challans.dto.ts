import { IsArray, IsOptional, ArrayMinSize, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkDownloadChallansDto {
  @ApiProperty({
    example: ['65a1b2c3d4e5f6g7h8i9j0k1', '65a1b2c3d4e5f6g7h8i9j0k2'],
    description: 'Array of delivery challan IDs to merge',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  challanIds?: string[];

  @ApiProperty({
    example: ['65a1b2c3d4e5f6g7h8i9j0k1', '65a1b2c3d4e5f6g7h8i9j0k2'],
    description: 'Array of bank order IDs to merge their challans',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  bankOrderIds?: string[];

  @ApiProperty({
    example: ['65a1b2c3d4e5f6g7h8i9j0k1', '65a1b2c3d4e5f6g7h8i9j0k2'],
    description: 'Array of BIP order IDs to merge their challans',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  bipOrderIds?: string[];
}
