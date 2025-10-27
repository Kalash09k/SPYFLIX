import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);

  async sendPayout({
    phone,
    amount,
    description,
  }: {
    phone: string;
    amount: number;
    description: string;
  }) {
    const CINETPAY_URL = 'https://api-checkout.cinetpay.com/v2/payout';

    const body = {
      apikey: process.env.CINETPAY_API_KEY,
      site_id: process.env.CINETPAY_SITE_ID,
      amount,
      currency: 'XAF',
      trans_id: `payout_${Date.now()}`,
      description,
      notify_url: `${process.env.BACKEND_URL}/webhooks/payout`,
      customer_name: 'Seller',
      customer_surname: '',
      customer_phone_number: phone,
      customer_email: '',
      channel: 'MOBILE_MONEY',
      country: 'CM',
    };

    try {
      const { data } = await axios.post(CINETPAY_URL, body, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (data?.code === '201' || data?.code === '00') {
        this.logger.log(`✅ Retrait de ${amount} XAF envoyé à ${phone}`);
        return { success: true, transactionId: data?.data?.transaction_id };
      } else {
        this.logger.error(
          `❌ Erreur payout: ${JSON.stringify(data, null, 2)}`
        );
        throw new BadRequestException('Échec du transfert Mobile Money.');
      }
    } catch (err: any) {
      this.logger.error(
        `Erreur axios payout: ${err.message}`,
        err.stack,
      );
      throw new BadRequestException('Erreur API CinetPay (payout)');
    }
  }
}
