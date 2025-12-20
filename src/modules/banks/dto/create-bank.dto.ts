import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBankDto {
  @ApiProperty({
    example: 'HBL Bank',
    description: 'Bank name',
  })
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @ApiProperty({
    example: 'Habib Bank Limited',
    description: 'Full bank name or description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}
