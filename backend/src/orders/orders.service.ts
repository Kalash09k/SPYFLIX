import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Order } from './entities/order.entity'; // Assuming TypeORM entity structure
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto';
import { User } from './entities/user.entity'; // Assuming TypeORM entity structure

interface Payment {
  paymentUrl: string;
  paymentId: string;
  transaction_id?: string;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  // TypeORM injections kept for legacy methods
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>, 
    private prisma: PrismaService, 
    @InjectQueue('orders') private ordersQueue: Queue,
    @InjectRepository(User) 
    private readonly userRepository: Repository<User>
  ) { }

  async confirmOrderLogic(orderId: string) {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.status !== 'pending') throw new BadRequestException('Commande non valide');

    order.status = 'confirmed';
    this.logger.log(JSON.stringify(order))
    await this.orderRepository.save(order);

    const sellerAmount = order.amount - order.commission;

    const seller = await this.userRepository.findOne({ where: { phone: order.sellerPhone } });
    if (!seller) throw new NotFoundException('Vendeur associé à la commande introuvable');

    seller.wallet += sellerAmount;
    await this.userRepository.save(seller);

    return { message: 'Commande confirmée, paiement au vendeur effectué', sellerAmount };
  }

  async getOrdersByBuyer(phone: string) {
    return this.orderRepository.find({
      where: { buyerPhone: phone },
      order: { expiresAt: 'DESC' },
    });
  }
  
  async getOrdersBySeller(phone: string) {
    return this.orderRepository.find({
      where: { sellerPhone: phone },
      order: { expiresAt: 'DESC' },
    });
  }

  // Create order: reserve place atomically, create order, init payment, schedule expiry job
  async createOrder(dto: CreateOrderDto): Promise<any> { 
    this.logger.log(`Received DTO: ${JSON.stringify(dto)}`);
    this.logger.log(`Subscription Group ID: ${dto.subscriptionGroupId}`);

    // 1. Find and validate group
    const group = await this.prisma.subscriptionGroup.findUnique({ where: { id: dto.subscriptionGroupId } });
    if (!group) throw new NotFoundException('Groupe non trouvé');

    const commissionRate = 0.10; // 10%
    const amount = group.pricePerSlot; 
    const commission = amount * commissionRate; 

    // 2. Atomic decrement availableSlots (RESERVE THE SLOT)
    const updated = await this.prisma.subscriptionGroup.updateMany({
      where: { id: group.id, availableSlots: { gt: 0 } },
      data: { availableSlots: { decrement: 1 } },
    });

    if (updated.count === 0) {
      throw new BadRequestException('Plus de places disponibles');
    }

    // Expiration dans 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); 

    // 3. Create the order
    const order = await this.prisma.order.create({
      data: {
        subscriptionGroupId: group.id,
        buyerId: dto.buyerId,
        ownerId: group.ownerId,
        amount,
        buyerWhatsApp: dto.buyerWhatsApp,
        buyerWhatsAppLink: dto.buyerWhatsApp ? `https://wa.me/${dto.buyerWhatsApp.replace('+', '')}` : null,
        status: 'PENDING',
        expiresAt,
        commission,
      },
    });

    if (!dto.buyerWhatsApp) {
      this.logger.error('buyerWhatsApp is missing from the DTO');
      throw new BadRequestException('Buyer WhatsApp number is required.');
    }

    // 4. Init payment (CinetPay)
    const payment: Payment = await this.initCinetPayPayment({ orderId: order.id, amount, buyerPhone: dto.buyerWhatsApp });
    this.logger.log(`Payment initialized for Order ${order.id}`);

    // 5. Update order with payment provider ID
    await this.prisma.order.update({
      where: { id: order.id },
      data: { paymentProviderId: payment.paymentId || payment.transaction_id },
    });

    // 6. Schedule expire job via BullMQ
    // Le 'delay' correspond aux 10 minutes d'expiration
    await this.ordersQueue.add('expire-order', { orderId: order.id }, { delay: 10 * 60 * 1000 });

    return { order, paymentUrl: payment.paymentUrl };
  }


  // Webhook handler - payload dépend de CinetPay
  async handleCinetPayWebhook({ orderId, transactionId, rawPayload }: { orderId: string; transactionId?: string; rawPayload?: any }) {
    // Recherche commande
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
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

    // Notifier le propriétaire via WhatsApp
    await this.notifyOwnerPayment(orderId);

    this.logger.log(`Webhook processed: order ${orderId} marked PAID`);
  }

  // Buyer confirme réception -> transfert funds to owner wallet and apply commission
  async confirmOrder(orderId: string, buyerId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== buyerId) throw new BadRequestException('Non autorisé');
    if (order.status !== 'PAID') throw new BadRequestException('Paiement non reçu ou déjà traité'); 

    const COMMISSION_RATE = parseFloat(process.env.COMMISSION_RATE || '0.10');
    const commission = parseFloat((order.amount * COMMISSION_RATE).toFixed(2));
    const ownerReceives = parseFloat((order.amount - commission).toFixed(2));

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { status: 'CONFIRMED', commission } });
      await tx.user.update({ where: { id: order.ownerId }, data: { wallet: { increment: ownerReceives } } });
      
      // La création des transactions est mise en commentaire car l'entité transaction n'est pas définie ici.
      // await tx.transaction.createMany({ 
      //   data: [
      //     { orderId, userId: order.ownerId, type: 'CREDIT', amount: ownerReceives, metadata: { note: 'Paiement vente' } },
      //     { orderId, userId: order.ownerId, type: 'COMMISSION', amount: commission, metadata: { note: 'Commission prélevée' } },
      //   ]
      // });
    });

    return { ok: true, commission, ownerReceives };
  }

  // Refund flow (manual or worker)
  async refundOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order introuvable');
    if (order.status === 'REFUNDED' || order.status === 'CONFIRMED') throw new BadRequestException('Impossible de rembourser');

    // Attempt refund via provider (CinetPay) - La logique réelle est omise mais la variable est déclarée
    let refundedViaProvider = false;
    // ... code d'appel à CinetPay ...

    // Transaction pour garantir l'atomicité de la mise à jour
    await this.prisma.$transaction(async (tx) => {
        // 1. Update order status
        await tx.order.update({ where: { id: orderId }, data: { status: 'REFUNDED' } });

        // 2. Return the slot
        await tx.subscriptionGroup.update({ 
            where: { id: order.subscriptionGroupId }, 
            data: { availableSlots: { increment: 1 } } 
        });

        // 3. Handle funds: si le remboursement via le provider échoue, on crédite le wallet de l'acheteur.
        if (!refundedViaProvider) { 
            await tx.user.update({ 
                where: { id: order.buyerId }, 
                data: { wallet: { increment: order.amount } } 
            });
        }
    });

    // Notifier buyer via WhatsApp (omitted for brevity, assume it's external to transaction)
    // ... (logic to notify buyer)

    return { ok: true };
  }

  async getOrderById(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Commande introuvable');
    return order;
  }

  async addOrderJob(orderId: string, userId: string) {
    await this.ordersQueue.add('process-order', { orderId, userId });
    return { message: `Order ${orderId} queued for processing` };
  }

  // stubbed initCinetPayPayment: adapte aux paramètres réels de CinetPay en prod
  private async initCinetPayPayment(opts: { orderId: string; amount: number; buyerPhone: string }) {
    // La logique CinetPay est mockée ici pour le développement:
    return { paymentUrl: `${process.env.FRONTEND_URL}/mock-payment?orderId=${opts.orderId}`, paymentId: `mock-${opts.orderId}`, };
  }
  
  // Notifier propriétaire via WhatsApp (WhatsAppCloud service)
  async notifyOwnerPayment(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { owner: true, buyer: true, subscriptionGroup: true } });
    if (!order) return;
    
    // Safety check for phone number existence before replace
    if (!order.owner?.phone) {
        this.logger.error(`Cannot notify owner for order ${orderId}: Owner phone not found.`);
        return;
    }
    
    const phone = order.owner.phone.replace('+', '');
    const buyerLink = order.buyerWhatsAppLink;
    const message = `🔔 NOUVELLE COMMANDE ! La commande #${order.id} a été PAYÉE.\nService : ${order.subscriptionGroup.serviceName} (${order.subscriptionGroup.plan}).\n\nVeuillez contacter le client ici 👉 ${buyerLink} \nVous avez 10 minutes pour fournir les identifiants.`;

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
}