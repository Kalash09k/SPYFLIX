import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Order } from './entities/order.entities';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto';
import { User } from './entities/user.entity';

interface Payment {
    paymentUrl: string;
    paymentId: string;
    transaction_id?: string;
  }

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
     private readonly orderRepository: Repository<Order>, private prisma: PrismaService, @InjectQueue('orders') private ordersQueue: Queue,
    @InjectRepository(User) private readonly userRepository: Repository<User> ) {}

    async confirmOrderLogic(orderId: string) {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.status !== 'pending') throw new BadRequestException('La commande ne peut plus être confirmée');

    order.status = 'confirmed';
    await this.orderRepository.save(order);

    const sellerAmount = order.amount - order.commission;

    const seller = await this.userRepository.findOne({ where: { phone: order.sellerPhone } });
    if (!seller) throw new NotFoundException('Vendeur associé à la commande introuvable');
    
    seller.wallet += sellerAmount;
    await this.userRepository.save(seller);

    return { message: 'Commande confirmée, paiement au vendeur effectué', sellerAmount };
  }

  // Create order: reserve place atomically, create order, init payment, schedule expiry job
  async create(dto: CreateOrderDto): Promise<Order> {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const newOrder = new Order();
    expiresAt
    return this.orderRepository.save(newOrder);
  }
  async createOrder(dto: { subscriptionGroupId: string; buyerId: string; buyerWhatsApp: string; amount: number, subscriptionId: string }) {
    this.logger.log(`Received DTO: ${JSON.stringify(dto)}`);
    this.logger.log(`Subscription Group ID: ${dto.subscriptionGroupId}`);
    const group = await this.prisma.subscriptionGroup.findUnique({ where: { id: dto.subscriptionGroupId }});
    if (!group) throw new NotFoundException('Groupe non trouvé');

    const commissionRate = 0.10; // 10%
    const commission = dto.amount * commissionRate;


    // Atomic decrement availableSlots
    const updated = await this.prisma.subscriptionGroup.updateMany({
      where: { id: group.id, availableSlots: { gt: 0 } },
      data: { availableSlots: { decrement: 1 } },
    });

    if (updated.count === 0) {
      throw new BadRequestException('Plus de places disponibles');
    }

    const amount = group.pricePerSlot;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const order = await this.prisma.order.create({
      data: {
        subscriptionGroupId: group.id,
        buyerId: dto.buyerId,
        ownerId: group.ownerId,
        amount,
        buyerWhatsApp: dto.buyerWhatsApp,
        buyerWhatsAppLink: `https://wa.me/${dto.buyerWhatsApp.replace('+', '')}`,
        status: 'PENDING',
        expiresAt,
        commission,
      },
    });

    // Init payment (CinetPay) — fonction dédiée
    const payment: Payment = await this.initCinetPayPayment({ orderId: order.id, amount, buyerPhone: dto.buyerWhatsApp, });

    await this.prisma.order.update({
      where: { id: order.id },
      data: { paymentProviderId: payment.paymentId || payment.transaction_id },
    });

    // schedule expire job via BullMQ (delay = 10min)
    await this.ordersQueue.add('expire-order', { orderId: order.id }, { delay: 10 * 60 * 1000 });

    return { order, paymentUrl: payment.paymentUrl };
  }

  // stubbed initCinetPayPayment: adapte aux paramètres réels de CinetPay en prod
  private async initCinetPayPayment(opts: { orderId: string; amount: number; buyerPhone: string }) {
    // Exemple minimal — remplacer par appel réel CinetPay selon doc
    const CINETPAY_API_KEY = process.env.CINETPAY_API_KEY;
    // Build body according to CinetPay API
    const body = {
      amount: opts.amount,
      currency: 'XAF',
      description: `Paiement order ${opts.orderId}`,
      return_url: `${process.env.FRONTEND_URL}/payment/success?orderId=${opts.orderId}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel?orderId=${opts.orderId}`,
      notify_url: `${process.env.BACKEND_URL}/webhooks/cinetpay`,
      customer: {
        msisdn: opts.buyerPhone,
      },
      metadata: {
        orderId: opts.orderId,
      },
    };

    // Ici on simule la réponse — remplace par axios.post réel
    // const resp = await axios.post('https://api.cinetpay.com/v1/payment', body, { headers: { Authorization: `Bearer ${CINETPAY_API_KEY}` }});
    // return { paymentUrl: resp.data.paymentUrl, paymentId: resp.data.paymentId || resp.data.transaction_id };

    // simulation pour le développement:
    return { paymentUrl: `${process.env.FRONTEND_URL}/mock-payment?orderId=${opts.orderId}`, paymentId: `mock-${opts.orderId}`,};
  }

  async getOrderById(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }});
    if (!order) throw new NotFoundException('Commande introuvable');
    return order;
  }

  // Webhook handler - payload dépend de CinetPay
  async handleCinetPayWebhook({ orderId, transactionId, rawPayload }: { orderId: string; transactionId?: string; rawPayload?: any }) {
    // Recherche commande
    const order = await this.prisma.order.findUnique({ where: { id: orderId }});
    if (!order) {
      this.logger.warn(`Webhook: order ${orderId} introuvable`);
      return;
    }
  
    // Idempotence : si déjà PAID or CONFIRMED ignore
    if (['PAID', 'CONFIRMED'].includes(order.status)) {
      this.logger.log(`Webhook: order ${orderId} déjà traité`);
      return;
    }
  
    // Marquer comme PAID et sauvegarder id transac
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'PAID', paymentId: transactionId || rawPayload?.cpm_trans_id },
    });
  
    await this.prisma.subscriptionGroup.update({ where: { id: order.subscriptionGroupId }, data: { availableSlots: { decrement: 1 } } });   // *******
  
    // Notifier le propriétaire via WhatsApp
    await this.notifyOwnerPayment(orderId);
  
    this.logger.log(`Webhook processed: order ${orderId} marked PAID`);
  }  

  // Notifier propriétaire via WhatsApp (WhatsAppCloud service)
  async notifyOwnerPayment(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { owner: true, buyer: true, subscriptionGroup: true }});
    if (!order) return;
    const phone = order.owner.phone.replace('+', '');
    const buyerLink = order.buyerWhatsAppLink;
    const message = `Bonjour 👋, un client a acheté votre offre ${order.subscriptionGroup.serviceName} (${order.subscriptionGroup.plan}). Contactez-le ici 👉 ${buyerLink} \nOrder ID: ${order.id} \nVous avez 10 minutes pour fournir les identifiants.`;

    await axios.post(`https://graph.facebook.com/v15.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: { body: message },
    }, {
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` }
    }).catch(err => {
      this.logger.error('Erreur WhatsApp notify: ' + (err?.response?.data || err.message));
    });
  }

  // Buyer confirme réception -> transfert funds to owner wallet and apply commission
  async confirmOrder(orderId: string, buyerId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }});
    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== buyerId) throw new BadRequestException('Non autorisé');
    if (order.status !== 'PENDING') throw new BadRequestException('Paiement non reçu ou déjà traité');

    const COMMISSION_RATE = parseFloat(process.env.COMMISSION_RATE || '0.10');
    const commission = parseFloat((order.amount * COMMISSION_RATE).toFixed(2));
    const ownerReceives = parseFloat((order.amount - commission).toFixed(2));

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { status: 'CONFIRMED', commission } });
      await tx.user.update({ where: { id: order.ownerId }, data: { wallet: { increment: ownerReceives } }});
      await tx.transaction.createMany({ data: [
        { orderId, userId: order.ownerId, type: 'CREDIT', amount: ownerReceives, metadata: { note: 'Paiement vente' } },
        { orderId, userId: order.ownerId, type: 'COMMISSION', amount: commission, metadata: { note: 'Commission prélevée' } },
      ]});
    });

    return { ok: true, commission, ownerReceives };
  }

  async addOrderJob(orderId: string, userId: string) {
    await this.ordersQueue.add('process-order', { orderId, userId });
    return { message: `Order ${orderId} queued for processing` };
  }
  

  // Refund flow (manual or worker)
  async refundOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }});
    if (!order) throw new NotFoundException('Order introuvable');
    if (order.status === 'REFUNDED' || order.status === 'CONFIRMED') throw new BadRequestException('Impossible de rembourser');

    // Try refund via provider (CinetPay) — simplified
    let refundedViaProvider = false;
    try {
      if (order.paymentProviderId) {
        // appel réel CinetPay refund ici
        await axios.post('https://api.cinetpay.com/v1/refund',
         { transaction_id: order.paymentProviderId,
             amount: order.amount },
              { headers: { Authorization: `Bearer ${process.env.CINETPAY_API_KEY}` 
              },
            },
        );
        refundedViaProvider = true;
      }
    } catch (err: any) {
      this.logger.error(`Refund provider failed: ${err.message}`);
      refundedViaProvider = false;
    }

    if (refundedViaProvider) {
      await this.prisma.order.update({ where: { id: orderId }, data: { status: 'REFUNDED' }});
    } else {
      // créditer wallet acheteur
      await this.prisma.$transaction([
        this.prisma.order.update({ where: { id: orderId }, data: { status: 'REFUNDED' } }),
        this.prisma.user.update({ where: { id: order.buyerId }, data: { wallet: { increment: order.amount } } }),
      ]);
    }

    // restituer la place
    await this.prisma.subscriptionGroup.update({ where: { id: order.subscriptionGroupId }, data: { availableSlots: { increment: 1 } } });

    // notifier buyer via WhatsApp (optionnel)
    const buyer = await this.prisma.user.findUnique({ where: { id: order.buyerId }});
    if (buyer) {
      const phone = buyer.phone.replace('+', '');
      const msg = `Bonjour, votre paiement pour ${order.subscriptionGroupId} a été remboursé.`;
      await axios.post(`https://graph.facebook.com/v15.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: msg },
      }, { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } }).catch(e => this.logger.error(e));
    }

    return { ok: true };
  }
  
}
