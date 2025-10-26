import { Module } from '@nestjs/common';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { BullModule } from '@nestjs/bull';
import { WhatsAppService } from './notifications/whatsapp.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './orders/entities/order.entities';


@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'subscription_db',
      entities: [Order],
      synchronize: true, // seulement en dev
    }),
    AuthModule,
    PrismaModule,
    PaymentsModule,
    WebhooksModule,
    SubscriptionsModule,
    OrdersModule,
    BullModule.forRootAsync({
      useFactory: () => ({
        redis: {
          host: 'localhost',
          port: 6380,
        },
      })

    }),
    BullModule.registerQueue({
      name: 'orders',
    }),],
    providers: [WhatsAppService],
    exports: [WhatsAppService],
})
export class AppModule { }
