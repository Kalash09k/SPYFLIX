import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private svc: OrdersService) {}

  @Post()
  async create(@Body() dto: CreateOrderDto) {
    return this.svc.createOrder(dto);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.svc.getOrderById(id);
  }

  @Post(':id/confirm')
  async confirm(@Param('id') id: string, @Body() body: { buyerId: string }) {
    return this.svc.confirmOrder(id, body.buyerId);
  }

  @Post('queue')
  async queueOrder(@Body() body: { orderId: string; userId: string }) {
    return this.svc.addOrderJob(body.orderId, body.userId);
  }
}

// comment