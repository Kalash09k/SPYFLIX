import { Controller, Post, Body, Get, Query, Param } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private svc: SubscriptionsService) {}

  @Post('create')
  async create(@Body() body: any) {
    return this.svc.createGroup(body);
  }

  @Get('search')
  async search(@Query('service') service: string) {
    return this.svc.search(service || '');
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.svc.getById(id);
  }
}
