import { Module, Global } from '@nestjs/common';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { BullModule } from '@nestjs/bull';
import { WhatsAppService } from './notifications/whatsapp.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './orders/entities/order.entity';
import { UsersService } from './users/users.service';
import { User } from './orders/entities/user.entity';
import { UsersModule } from './users/users.module';
import { PayoutModule } from './payments/payout.module';
import { TestController } from './test/test.controller';
import { NotificationsService } from './notifications/notifications.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'subscription_db',
      entities: [Order, User],
      synchronize: true, // seulement en dev
    }),
    AuthModule,
    PrismaModule,
    PaymentsModule,
    WebhooksModule,
    SubscriptionsModule,
    OrdersModule,
    UsersModule,
    OrdersModule,
    PayoutModule,
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
    controllers: [TestController],
    providers: [WhatsAppService, UsersService, NotificationsService],
    exports: [WhatsAppService, NotificationsService],
})
export class AppModule { }
