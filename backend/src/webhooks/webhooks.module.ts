import { Module } from '@nestjs/common';
import { CinetpayWebhooksController } from './cinetpay.controller';
import { OrdersModule } from '../orders/orders.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsService } from '../payments/payments.service';
import { WhatsAppService } from '../notifications/whatsapp.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/entities/order.entities';

@Module({
  imports: [TypeOrmModule.forFeature([Order]), OrdersModule, NotificationsModule],
  controllers: [CinetpayWebhooksController],
  providers: [PaymentsService, WhatsAppService],
})

export class WebhooksModule {}
