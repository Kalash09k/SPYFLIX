import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as Axios from 'axios';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  // Méthode unifiée pour envoyer soit un TEXTE simple, soit un TEMPLATE
  async sendMessage(opts: {
    to: string; // numéro du client
    templateName?: string; // ex: payment_confirmation (pour les templates)
    language?: string; // ex: fr (pour les templates)
    variables?: (string | number | boolean)[];
    phone?: string;
    message?: string; // Message texte simple (si pas de template)
  }) {
    const url = `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    
    let payload: any;
    
    if (opts.message) {
      // 1. Payload pour message TEXTE simple
      payload = {
        messaging_product: 'whatsapp',
        to: opts.to,
        type: 'text',
        text: {
            body: opts.message,
        },
      };
    } else if (opts.templateName && opts.language) {
      // 2. Payload pour TEMPLATE (logique initiale)
      payload = {
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
    } else {
        throw new Error("WhatsAppService requires either a 'message' or a 'templateName' and 'language'.");
    }


    try {
      const response: Axios.AxiosResponse = await axios.post(url, payload, {
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

  // NOUVELLE MÉTHODE : Notification de paiement reçu
  async notifyPaymentReceived(phone: string, serviceName: string, amount: number) {
    const message = `✅ Bonjour 👋 ! Votre paiement de ${amount} XAF pour ${serviceName} a bien été reçu. 
Le vendeur vous contactera sous peu pour vous envoyer vos identifiants 🔐.`;
    await this.sendMessage({ to: phone, message });
  }

  // NOUVELLE MÉTHODE : Notification de commande confirmée
  async notifyOrderConfirmed(phone: string, serviceName: string) {
    const message = `🎉 Bonne nouvelle ! Votre accès à ${serviceName} est confirmé. 
Merci d’utiliser notre plateforme 💪.`;
    await this.sendMessage({ to: phone, message });
  }

  // NOUVELLE MÉTHODE : Notification de remboursement
  async notifyRefunded(phone: string, serviceName: string, amount: number) {
    const message = `⏳ Votre commande ${serviceName} a expiré. Vous avez été automatiquement remboursé de ${amount} XAF. 
Vous pouvez choisir un autre vendeur depuis la plateforme.`;
    await this.sendMessage({ to: phone, message });
  }
}
