import { Controller, Post, Req, Logger } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);
  constructor(private ordersService: OrdersService) {}

  @Post('cinetpay')
  async cinetpay(@Req() req: any) {
    const payload = req.body;
    // TODO: verify signature using headers
    this.logger.log('Webhook CinetPay received');
    await this.ordersService.handleCinetPayWebhook(payload);
    return { ok: true };
  }
}
