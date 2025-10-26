import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrdersProcessor } from './orders.processor';
import { OrdersService } from "./orders.service";
import { PrismaService } from "../../prisma/prisma.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { WhatsAppService } from '../notifications/whatsapp.service';
import { OrdersMonitorService } from './orders-monitor.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entities';
import { OrdersController } from './orders.controller';
import { User } from './entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, User]),
    BullModule.registerQueue({
      name: 'orders',
    }),
    PrismaModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersProcessor, OrdersService, PrismaService, OrdersMonitorService, WhatsAppService],
  exports: [OrdersService],
})
export class OrdersModule {}