import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CategoryStatus } from '../schemas/category.schema';

export class CreateCategoryDto {
  @ApiProperty({
    example: 'Electronics',
    description: 'Category name',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Electronic items and gadgets',
    description: 'Category description',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    enum: CategoryStatus,
    example: CategoryStatus.ACTIVE,
    description: 'Category status',
    required: false,
  })
  @IsEnum(CategoryStatus)
  @IsOptional()
  status?: CategoryStatus;
}
