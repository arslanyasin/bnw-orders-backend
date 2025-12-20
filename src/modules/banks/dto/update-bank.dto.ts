import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BankStatus } from '../schemas/bank.schema';

export class UpdateBankDto {
  @ApiProperty({
    example: 'HBL Bank',
    description: 'Bank name',
    required: false,
  })
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiProperty({
    example: 'Habib Bank Limited',
    description: 'Full bank name or description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    enum: BankStatus,
    example: BankStatus.ACTIVE,
    description: 'Bank status',
    required: false,
  })
  @IsEnum(BankStatus, { message: 'Invalid bank status' })
  @IsOptional()
  status?: BankStatus;
}
