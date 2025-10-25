import { WebhooksController } from "../webhooks/webhooks.controller";
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrdersProcessor } from './orders.processor';
import { OrdersService } from "./orders.service";
import { PrismaService } from "../../prisma/prisma.service";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'orders',
    }),
    PrismaModule,
  ],
  providers: [OrdersProcessor, OrdersService, PrismaService],
  exports: [OrdersService],
})
export class OrdersModule {}