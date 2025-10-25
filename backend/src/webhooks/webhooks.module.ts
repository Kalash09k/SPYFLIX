import { Module } from '@nestjs/common';
import { CinetpayWebhooksController } from './cinetpay.controller';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [CinetpayWebhooksController],
})
export class WebhooksModule {}
