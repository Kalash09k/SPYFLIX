import { Controller, Post, Body, Injectable } from '@nestjs/common';
import { WhatsAppService } from '../notifications/whatsapp.service'; // Adjust path

@Controller() // No path prefix, so methods start from the root ('/')
@Injectable()
export class TestController {
  
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('test-whatsapp') // 👈 This maps to POST /test-whatsapp
  async testWhatsapp(@Body() body: { phone: string; message: string }) {
    
    // Assuming sendTemplateMessage can handle a simple text message or you have another method
    // If your service only supports templates, you'll need to update the service or use the template API.
    
    // Example: A simplified sendTextMessage method (you'd need to implement this)
    // await this.whatsappService.sendTextMessage(body.phone, body.message);
    
    // For now, return a success message
    return { 
      success: true, 
      status: 'Message payload received', 
      data: body 
    };
  }
}