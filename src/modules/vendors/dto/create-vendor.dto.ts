import { IsString, IsNotEmpty, IsEmail, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VendorStatus } from '../schemas/vendor.schema';

export class CreateVendorDto {
  @ApiProperty({
    example: 'ABC Suppliers Ltd',
    description: 'Vendor company name',
  })
  @IsString()
  @IsNotEmpty()
  vendorName: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'Vendor phone number',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    example: 'contact@abcsuppliers.com',
    description: 'Vendor email address',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: '123 Business Street',
    description: 'Vendor street address',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    example: 'New York',
    description: 'Vendor city',
  })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({
    example: 'active',
    enum: VendorStatus,
    description: 'Vendor status (active/inactive)',
    required: false,
  })
  @IsEnum(VendorStatus, { message: 'Invalid status' })
  @IsOptional()
  status?: VendorStatus;
}
