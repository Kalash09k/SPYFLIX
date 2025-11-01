import { Controller, Post, Body, Logger } from '@nestjs/common';
import { WhatsAppService } from '../notifications/whatsapp.service';
import { PayoutService } from '../payments/payout.service';

@Controller('webhooks/payout')
export class PayoutWebhookController {
  private readonly logger = new Logger(PayoutWebhookController.name);

  constructor(
    private whatsappService: WhatsAppService,
    private payoutService: PayoutService) { }

  @Post()
  async handlePayoutWebhook(@Body() body: any) {
    this.logger.log('💸 Webhook Payout reçu : ' + JSON.stringify(body, null, 2));

    const phone = body.phone || body.customer_phone_number;
if (body.status === 'SUCCESS') {
    await this.payoutService.updateStatus(
        body.transaction_id,
        'SUCCESS'
    );

} else if (body.status === 'FAILED') {
    await this.payoutService.updateStatus(
        body.transaction_id, 
        'FAILED'
    );
}

    if (body.status === 'SUCCESS') {
      const message = `✅ Bonjour ! Votre retrait de ${body.amount} XAF a été confirmé et envoyé sur votre compte Mobile Money. Merci d’utiliser notre plateforme 🔥`;
      await this.whatsappService.sendTemplateMessage({
        to: phone,
        templateName: 'payout_confirmation',
        language: 'fr',
        variables: [body.amount],
      });
      // Tu pourrais enregistrer ça dans ta table "transactions" par ex.
      this.logger.log(`✅ Retrait confirmé pour ${body.phone}`);
    } else {
      this.logger.warn(`⚠️ Retrait échoué pour ${body.phone}`);
    }

    return { ok: true };
  }
}
