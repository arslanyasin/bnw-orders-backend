import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class TheWhatBotActionDto {
  @ApiProperty({
    example: 'set_field_value',
    description: 'Action type',
    enum: ['set_field_value', 'send_flow'],
  })
  @IsString()
  @IsNotEmpty()
  action: 'set_field_value' | 'send_flow';

  @ApiProperty({
    example: 'order_main_id',
    description: 'Field name to set',
    required: false,
  })
  @IsString()
  @IsOptional()
  field_name?: string;

  @ApiProperty({
    example: 'REF-2024-001',
    description: 'Value to set',
    required: false,
  })
  @IsString()
  @IsOptional()
  value?: string;

  @ApiProperty({
    example: '1767708715182',
    description: 'Flow ID to send',
    required: false,
  })
  @IsString()
  @IsOptional()
  flow_id?: string;
}

export class SendWhatsAppTheWhatBotDto {
  @ApiProperty({
    example: '+923001234567',
    description: 'Customer phone number with country code',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    example: '',
    description: 'Email address (optional, can be empty string)',
  })
  @IsString()
  email: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'First name',
  })
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @ApiProperty({
    example: '',
    description: 'Last name (optional, can be empty string)',
  })
  @IsString()
  last_name: string;

  @ApiProperty({
    description: 'Array of actions to perform',
    type: [TheWhatBotActionDto],
    example: [
      {
        action: 'set_field_value',
        field_name: 'order_main_id',
        value: 'REF-2024-001',
      },
      {
        action: 'send_flow',
        flow_id: '1767708715182',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TheWhatBotActionDto)
  actions: TheWhatBotActionDto[];
}
