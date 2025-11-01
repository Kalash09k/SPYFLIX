import { Controller, Post, Body, Headers, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import crypto from 'crypto';
import { WhatsAppService } from '../notifications/whatsapp.service';
import { Order } from '../orders/entities/order.entity';

@Controller('webhooks')
export class CinetpayWebhooksController {
  private readonly logger = new Logger(CinetpayWebhooksController.name);

  constructor(
    private readonly whatsappService: WhatsAppService,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  @Post('cinetpay')
  async handle(
    @Body() body: any,
    @Headers('x-token') xToken: string,
    @Headers('x-signature') xSignature: string,
  ) {
    try {
      // 1️⃣ Vérifier le token
      const expectedToken = process.env.CINETPAY_TOKEN;
      if (!expectedToken) throw new Error('CINETPAY_TOKEN manquant dans le .env');

      if (xToken !== expectedToken) {
        this.logger.warn('🚫 Webhook refusé : Token invalide');
        return { message: 'Forbidden: Invalid token' };
      }

      this.logger.log(`📩 Webhook reçu de CinetPay : ${JSON.stringify(body, null, 2)}`);

      // 2️⃣ Vérifier la signature HMAC (authenticité)
      const secretKey = process.env.CINETPAY_SECRET_KEY;
      if (!secretKey) throw new Error('CINETPAY_SECRET_KEY manquant dans le .env');

      const computedSignature = crypto
        .createHmac('sha256', secretKey)
        .update(JSON.stringify(body))
        .digest('hex');

      if (xSignature !== computedSignature) {
        this.logger.error('🚨 Signature HMAC invalide : webhook potentiellement falsifié');
        return { message: 'Forbidden: Invalid signature' };
      }

      // 3️⃣ Vérifier le statut réel du paiement auprès de CinetPay
      const transactionId = body.transaction_id || body.data?.transaction_id;
      if (!transactionId) throw new BadRequestException('transaction_id manquant');

      this.logger.log(`🔍 Vérification du paiement ${transactionId} via API CinetPay...`);

      const response = await axios.post('https://api-checkout.cinetpay.com/v2/payment/check', {
        transaction_id: transactionId,
        apikey: process.env.CINETPAY_API_KEY,
        site_id: process.env.CINETPAY_SITE_ID,
      });

      const paymentData = response.data?.data;
      this.logger.log(`🧾 Données de paiement CinetPay : ${JSON.stringify(paymentData, null, 2)}`);

      if (!paymentData || paymentData.status !== 'ACCEPTED') {
        this.logger.warn('⚠️ Paiement non confirmé, aucun message envoyé.');
        return { message: 'ignored' };
      }

      // 4️⃣ Extraire les métadonnées
      const metadata = typeof paymentData.metadata === 'string'
        ? JSON.parse(paymentData.metadata)
        : paymentData.metadata;

      const orderId = metadata?.orderId;
      if (!orderId) throw new BadRequestException('Order ID manquant');

      // 5️⃣ Trouver et mettre à jour la commande
      const order = await this.orderRepository.findOne({ where: { id: orderId } });
      if (!order) throw new BadRequestException(`Commande ${orderId} introuvable`);

      order.status = 'pending';
      order.paymentReference = transactionId;
      order.expiresAt = new Date(Date.now() + 10 * 60 * 1000); // expire après 10 min
      this.logger.log(JSON.stringify(order))
      await this.orderRepository.save(order);

      this.logger.log(`✅ Commande ${orderId} marquée comme PAYÉE.`);

      // 6️⃣ Notifications WhatsApp
      const buyerPhone = metadata?.buyerPhone || '237690000000';
      const buyerName = metadata?.buyerName || 'Client';
      const sellerPhone = metadata?.sellerPhone || '237691111111';
      const serviceName = metadata?.serviceName || 'Abonnement Premium';
      const amount = metadata?.amount || '2000';

      // Acheteur
      await this.whatsappService.sendTextMessage({
        to: buyerPhone,
        templateName: 'payment_confirmation',
        language: 'fr',
        variables: [buyerName, serviceName, 'PAYÉ', orderId, amount, sellerPhone],
      });

      // Vendeur
      await this.whatsappService.sendTextMessage({
        to: order.sellerPhone,
        templateName: 'confirmation_de_vente',
        language: 'fr',
        variables: [serviceName, buyerName, orderId],
      });

      if (body.transaction_status === 'ACCEPTED' || body.code === '00') {
  const orderId = body.metadata?.orderId;
  const order = await this.orderRepository.findOne({ where: { id: orderId } });
  
  if (order) {
    // notifier l’acheteur
    await this.whatsappService.notifyPaymentReceived(
      order.buyerPhone,
      order.serviceName,
      body.amount
    );
  }
}


      this.logger.log(`📤 Notifications envoyées pour la commande ${orderId}`);

      // 7️⃣ Réponse finale
      return { message: 'success', orderId };
    } catch (err: any) {
      this.logger.error(`❌ Erreur webhook CinetPay : ${err.message}`, err.stack);
      throw new BadRequestException('Erreur lors du traitement du webhook');
    }
  }
}
