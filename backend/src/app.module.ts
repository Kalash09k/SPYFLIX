import { Module } from '@nestjs/common';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PrismaService } from '../prisma/prisma.service';
import { BullModule } from '@nestjs/bull';
import { OrdersProcessor } from './orders/orders.processor';


@Module({
  imports: [AuthModule,
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
})
export class AppModule { }
