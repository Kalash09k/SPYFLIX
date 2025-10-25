import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { any } from 'zod';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  async sendMessage(to: string, message: string) {
    const url = `https://graph.facebook.com/v24.0/${process.env.WHATSAPP_PHONE_ID}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
    };

    try {
      const res = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      this.logger.log(`✅ Message WhatsApp envoyé à ${to}`);
      return res.data;
    } catch (err: any) {
      this.logger.error(`❌ Erreur envoi WhatsApp : ${err.message}`);
      throw err;
    }
  }
}
