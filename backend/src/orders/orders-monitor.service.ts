import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Order } from './entities/order.entity';
import { WhatsAppService } from '../notifications/whatsapp.service';
import { LessThanOrEqual } from 'typeorm';
import axios from 'axios';

@Injectable()
export class OrdersMonitorService {
  private readonly logger = new Logger(OrdersMonitorService.name);

  constructor(
    private dataSource: DataSource,
    private whatsappService: WhatsAppService,
  ) {
    this.startMonitoring();
  }

  async startMonitoring() {
    this.logger.log('⏱️ Lancement du monitor des commandes expirées');
    setInterval(() => this.checkExpiredOrders(), 60 * 1000); 
  }

  async checkExpiredOrders() {
    const now = new Date();
    const repo = this.dataSource.getRepository(Order);

    const expiredOrders = await repo.find({
      where: {
        status: 'pending',
        expiresAt: LessThanOrEqual(now),
      },
    });

    for (const order of expiredOrders) {
      this.logger.warn(`⌛ Commande expirée : ${order.id}`);

      // 1️⃣ Remettre le paiement à l'acheteur
      try {
        await this.refund(order);
      } catch (err: any) {
        this.logger.error(`Erreur remboursement commande. Le proprietaire n'a pas fourni les identifiants à temps ${order.id}: ${err.message}`);
      }

      // 2️⃣ Mettre à jour le statut
      order.status = 'refunded';
      await repo.save(order);

      // 3️⃣ Notifier l’acheteur via WhatsApp
      await this.whatsappService.sendMessage({
        to: order.buyerPhone,
        templateName: 'refund_notification',
        language: 'fr',
        variables: [order.serviceName],
        phone: order.buyerPhone,
        message: '',
      });

      this.logger.log(`✅ Commande remboursée et notification envoyée : ${order.id}`);
      // 4️⃣ Proposer un autre vendeur (logique simple)
      // Ici, tu peux choisir un autre sellerPhone disponible
      // ou renvoyer une liste des offres restantes
    }
  }

  private async refund(order: Order) {
    // Exemple : utiliser l’API CinetPay pour rembourser
    await axios.post('https://api-checkout.cinetpay.com/v2/refund', {
      amount: 2500, // montant réel
      transaction_id: order.id,
      apikey: process.env.CINETPAY_API_KEY,
      site_id: process.env.CINETPAY_SITE_ID,
    });
    this.logger.log(`💰 Remboursement effectué pour la commande ${order.id}`);
  }
}
