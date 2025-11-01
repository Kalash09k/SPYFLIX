import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayoutService } from './payout.service';
import { PayoutWebhookController } from '../webhooks/payout.controller';
import { Payout } from './entities/payout.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payout]),
    NotificationsModule
  ],
  controllers: [PayoutWebhookController],
  providers: [PayoutService],
  exports: [PayoutService]
})
export class PayoutModule {}
