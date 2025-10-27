import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  async sendTemplateMessage(opts: {
    to: string; // numéro du client
    templateName?: string; // ex: payment_confirmation
    language?: string; // ex: fr
    variables?: (string | number | boolean)[]; // ex: [nom, service, plateforme]
    phone?: string;
    message?: string;
  }) {
    const url = `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      to: opts.to,
      type: 'template',
      template: {
        name: opts.templateName,
        language: { code: opts.language },
        components: [
          {
            type: 'body',
            parameters: opts.variables.map((text) => ({ type: 'text', text })),
          },
        ],
      },
    };
try {
      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      this.logger.log(`✅ Message WhatsApp envoyé à ${opts.to}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `❌ Erreur lors de l’envoi WhatsApp : ${error.response?.data?.error?.message || error.message}`,
      );
      throw error;
    }
  }
}