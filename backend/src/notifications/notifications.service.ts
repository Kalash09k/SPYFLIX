// src/notifications/notifications.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private whatsappService: WhatsAppService) {}

  // 🔔 Paiement reçu
  async sendPaymentReceivedNotification(order: any) {
    try {
      // ✅ CORRECTION : On passe un seul objet avec les propriétés 'to' et 'message'
      await this.whatsappService.sendTextMessage({
        to: order.buyerPhone,
        message: `✅ Bonjour 👋 ! Votre paiement de ${order.amount} XAF pour ${order.serviceName} a bien été reçu. Le vendeur vous contactera sous peu 🔐.`
      });

      // ✅ CORRECTION
      await this.whatsappService.sendTextMessage({
        to: order.sellerPhone,
        message: `💬 Un client vient d'acheter votre offre ${order.serviceName} (${order.amount} XAF). Contactez-le ici 👉 https://wa.me/${order.buyerPhone}`
      } );
    } catch (err: any) {
      this.logger.error(`Erreur notification paiement: ${err.message}`);
    }
  }

  // 🎉 Commande confirmée
  async sendOrderConfirmedNotification(order: any) {
    try {
      // ✅ CORRECTION
      await this.whatsappService.sendTextMessage({
        to: order.buyerPhone,
        message: `🎉 Votre accès à ${order.serviceName} est confirmé ! Merci d’utiliser notre plateforme 💪.`
      });

      // ✅ CORRECTION
      await this.whatsappService.sendTextMessage({
        to: order.sellerPhone,
        message: `✅ L'acheteur a confirmé la réception pour ${order.serviceName}. Votre solde sera crédité sous peu.`
      });
    } catch (err: any) {
      this.logger.error(`Erreur notification confirmation: ${err.message}`);
    }
  }

  // ⏳ Commande expirée (remboursement)
  async sendOrderExpiredNotification(order: any) {
    try {
      // ✅ CORRECTION
      await this.whatsappService.sendTextMessage({
        to: order.buyerPhone,
        message: `⏳ Votre commande ${order.serviceName} a expiré. Vous avez été automatiquement remboursé de ${order.amount} XAF. Vous pouvez choisir un autre vendeur.`
      });

      // ✅ CORRECTION
      await this.whatsappService.sendTextMessage({
        to: order.sellerPhone,
        message: `⚠️ Votre commande ${order.serviceName} a expiré sans confirmation. Le paiement a été remboursé à l'acheteur.`
      });
    } catch (err: any) {
      this.logger.error(`Erreur notification expiration: ${err.message}`);
    }
  }

  // 💸 Retrait confirmé
  async sendPayoutNotification(phone: string, amount: number) {
    try {
      // ✅ CORRECTION
      await this.whatsappService.sendTextMessage({
        to: phone,
        message: `💸 Votre retrait de ${amount} XAF a été confirmé et envoyé sur votre compte Mobile Money.`
      });
    } catch (err: any) {
      this.logger.error(`Erreur notification retrait: ${err.message}`);
    }
  }
}
