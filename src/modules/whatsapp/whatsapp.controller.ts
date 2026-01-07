import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@common/interfaces/user-role.enum';
import { WhatsAppService } from '@common/services/whatsapp.service';
import { SendWhatsAppTheWhatBotDto } from '@common/dto/send-whatsapp-thewhatbot.dto';
import { SendWhatsAppMessageDto } from '@common/dto/send-whatsapp-message.dto';

@ApiTags('WhatsApp')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'whatsapp', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class WhatsAppController {
  constructor(private readonly whatsAppService: WhatsAppService) {}

  @Post('send-message')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send WhatsApp message to customer via TheWhatBot API (Direct format)' })
  @ApiResponse({
    status: 200,
    description: 'WhatsApp message sent successfully',
    schema: {
      example: {
        success: true,
        message: 'WhatsApp message sent successfully',
        data: {
          // TheWhatBot API response data
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to send WhatsApp message - API configuration error or external API failure',
  })
  async sendWhatsAppMessage(@Body() sendWhatsAppDto: SendWhatsAppTheWhatBotDto) {
    return this.whatsAppService.sendWhatsAppDirectFormat(sendWhatsAppDto);
  }

  @Post('send-message-simple')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send WhatsApp message to customer via TheWhatBot API (Simplified format - auto-transforms)' })
  @ApiResponse({
    status: 200,
    description: 'WhatsApp message sent successfully',
  })
  async sendWhatsAppMessageSimple(@Body() sendWhatsAppDto: SendWhatsAppMessageDto) {
    return this.whatsAppService.sendWhatsAppViaTheWhatBot(sendWhatsAppDto);
  }
}
