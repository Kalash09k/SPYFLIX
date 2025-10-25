import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('init')
  async init(
    @Body() body: { orderId: string; amount: number; customerPhone?: string }) {
      if (!body.orderId || !body.amount) {
        throw new BadRequestException('orderId et amount sont obligatoires');
      }
      const result = await this.paymentsService.initPayment({
        orderId: body.orderId,
        amount: body.amount,
        customerPhone: body.customerPhone,
      });

      return result;
  }
}
