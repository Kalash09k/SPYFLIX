// orders.processor.ts (worker)
import { Processor, Process, InjectQueue } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { OrdersService } from './orders.service';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface OrderJobData {
    orderId: string;
    userId: string;
}

@Processor('orders')
@Injectable()
export class OrdersProcessor {

    constructor(
        @InjectQueue('orders') private bullQueue: Queue,
        private prisma: PrismaService, private ordersService: OrdersService) { }

    @Process('processOrder')
    async handleOrder(job: Job) {
        console.log('Processing order:', job.data);
    }

    @Process('expire-order')
    async handleExpireOrder(job: Job<OrderJobData>) {
        const { orderId, userId } = job.data;

        console.log(`Processing order ${orderId} for user ${userId}`);

        const payment = {
            paymentUrl: 'https://example.com',
            paymentId: `pay_${orderId}`,
            transaction_id: `tx_${orderId}`,
            message: 'Order payment processed',
        };

        const order = await this.ordersService.getOrderById(orderId);
        if (!order) return;
        if (order.status === 'PENDING' || order.status === 'PAID') {
            await this.ordersService.refundOrder(orderId);
            // après avoir crée l'ordre
            await this.ordersService.refundOrder(orderId), { delay: 10 * 60 * 1000 };

            // Optionnel : notifier buyer via WhatsApp que le paiement a été remboursé
            return { status: 'completed', payment };
        }
    }
}
