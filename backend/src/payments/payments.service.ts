import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  async initPayment(opts: {
    orderId: string;
    amount: number;
    currency?: string;
    designation?: string;
    customerPhone?: string;
  }) {
    const CINETPAY_URL = 'https://api-checkout.cinetpay.com/v2/payment';
    const siteId = process.env.CINETPAY_SITE_ID;
    const apiKey = process.env.CINETPAY_API_KEY;
    const mockMode = process.env.PAYMENTS_MOCK_MODE === 'true';

    if (mockMode || !siteId || !apiKey) {
      const fakePaymentUrl = `https://fake-cinetpay.com/pay/${opts.orderId}`;
      const fakePaymentId = `SIM-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      this.logger.warn(
        `⚠️ Mode simulation activé (aucun site_id ou apikey configuré). Paiement simulé pour ${opts.orderId}.`
      );

      return {
        paymentUrl: fakePaymentUrl,
        paymentId: fakePaymentId,
        raw: {
          simulated: true,
          orderId: opts.orderId,
          amount: opts.amount,
          currency: opts.currency || 'XAF',
        },
      };
    }


    const body = {
      amount: opts.amount,
      currency: opts.currency || 'XAF',
      site_id: process.env.CINETPAY_SITE_ID,
      apikey: process.env.CINETPAY_API_KEY,
      designation: opts.designation || `Paiement order ${opts.orderId}`,
      customer_name: 'Client',
      customer_surname: '',
      customer_email: '',
      customer_phone_number: opts.customerPhone || '',
      return_url: `${process.env.FRONTEND_URL}/payment/success?orderId=${opts.orderId}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel?orderId=${opts.orderId}`,
      notify_url: `${process.env.BACKEND_URL}/webhooks/cinetpay`,
      metadata: JSON.stringify({ orderId: opts.orderId }),
    };

    try {
      const response = await axios.post<any>(CINETPAY_URL, body, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      });

      const data: any = response.data;


      if (data?.data?.payment_url || data?.payment_url) {
        const paymentUrl = data.data?.payment_url || data.payment_url;
        const paymentId = data.data?.transaction_id || data.transaction_id || null;

        this.logger.log(
          `✅ Paiement initialisé avec succès pour l’ordre ${opts.orderId} - URL: ${paymentUrl}`
        );

        return { paymentUrl, paymentId, raw: data };
      }


      this.logger.error(
        `Réponse inattendue de CinetPay pour orderId=${opts.orderId}`,
        JSON.stringify(data, null, 2)
      );
      throw new BadRequestException("Impossible d'initialiser le paiement.");
    } catch (err: any) {

      const isAxiosError = err?.isAxiosError || err?.response;

      if (isAxiosError) {
        this.logger.error(
          `Erreur Axios durant initPayment pour orderId=${opts.orderId}`,
          JSON.stringify({
            status: err.response?.status,
            data: err.response?.data,
            code: err.code,
            url: err.config?.url,
          }),
        );
      } else if (err instanceof Error) {
        this.logger.error(
          `Erreur JS durant initPayment pour orderId=${opts.orderId}: ${err.message}`,
          err.stack,
        );
      } else {
        this.logger.error(
          `Erreur inconnue durant initPayment pour orderId=${opts.orderId}`,
          String(err),
        );
      }

      throw new BadRequestException('Le service de paiement a rencontré une erreur.');
    }
  }
}
