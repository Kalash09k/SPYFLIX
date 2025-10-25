import { Module } from '@nestjs/common';
import { CinetpayWebhooksController } from './cinetpay.controller';
import { OrdersModule } from '../orders/orders.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsService } from '../payments/payments.service';

@Module({
  imports: [OrdersModule, NotificationsModule],
  controllers: [CinetpayWebhooksController],
  providers: [PaymentsService],
})

export class WebhooksModule {}
