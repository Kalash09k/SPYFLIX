import { Controller, Post, Req, Res, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { OrdersService } from '../orders/orders.service'; // service métier

@Controller('webhooks')
export class CinetpayWebhooksController {
  private logger = new Logger('CinetpayWebhooks');

  constructor(private ordersService: OrdersService) { }

  @Post('cinetpay')
  async handle(@Req() req: Request, @Res() res: Response) {
    const payload = req.body; // CinetPay envoie form values (x-www-form-urlencoded) ou JSON selon config
    const receivedToken = (req.headers['x-token'] as string) || (req.headers['X-Token'] as string);

    // Build the data string exactly in the order required by CinetPay
    const dataString =
      (payload.cpm_site_id || '') +
      (payload.cpm_trans_id || '') +
      (payload.cpm_trans_date || '') +
      (payload.cpm_amount || '') +
      (payload.cpm_currency || '') +
      (payload.signature || '') +
      (payload.payment_method || '') +
      (payload.cel_phone_num || '') +
      (payload.cpm_phone_prefixe || '') +
      (payload.cpm_language || '') +
      (payload.cpm_version || '') +
      (payload.cpm_payment_config || '') +
      (payload.cpm_page_action || '') +
      (payload.cpm_custom || '') +
      (payload.cpm_designation || '') +
      (payload.cpm_error_message || '');

    const secret = process.env.CINETPAY_SECRET_KEY || '';
    const hmac = crypto.createHmac('sha256', secret).update(dataString).digest('hex');

    // Vérification timing-safe
    const valid = receivedToken && crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(receivedToken));
    const received = Buffer.from(hmac || "");
    const expected = Buffer.from(process.env.CINETPAY_TOKEN || "");

    if (received.length !== expected.length) {
      this.logger.warn("❌ Mauvaise longueur de token reçue");
      return res.status(403).json({ message: "Forbidden: Invalid token" });
    }

    if (!crypto.timingSafeEqual(received, expected)) {
      this.logger.warn("❌ Token invalide reçu sur le webhook");
      return res.status(403).json({ message: "Forbidden: Invalid token" });
    }

    if (!valid) {
      this.logger.warn('Webhook CinetPay: token invalide', { receivedToken, hmac, dataString });
      return res.status(400).json({ ok: false, message: 'Invalid token' });
    }

    // Ok token valide -> traiter le payload
    try {
      // Extrait orderId depuis cpm_custom (si tu l'as envoyé) — doc recommande utiliser cpm_custom pour metadata.
      const cpmCustom = payload.cpm_custom;
      // cpm_custom peut être stringified JSON si tu as envoyé JSON.stringify({orderId: ...})
      let metadata: any = null;
      try { metadata = JSON.parse(cpmCustom); } catch (e) { metadata = cpmCustom; }

      const orderId = metadata?.orderId || payload.orderId || payload['orderId'] || null;
      const transactionId = payload.cpm_trans_id || payload.transaction_id || payload.transactionId || null;
      const statusText = payload.cpm_error_message || payload.status || payload.transaction_status || 'UNKNOWN';

      // Si status indique succès (dépend de la valeur exacte renvoyée par CinetPay)
      // Sur la doc : on vérifie les champs et code. Ici on considère "Success" / "ACCEPTED" / erreur vide comme payé.
      const paid = (payload.cpm_error_message === null || payload.cpm_error_message === '' || payload.cpm_error_message === 'PAID' || payload.cpm_error_message === 'SUCCESS' || payload.cpm_payment_status === 'ACCEPTED' || payload.status === 'SUCCESS');

      if (orderId && paid) {
        // appelle la logique métier pour marquer commande payée (idempotence à l'intérieur)
        await this.ordersService.handleCinetPayWebhook({
          orderId: orderId,
          transactionId,
          rawPayload: payload,
        });
      } else {
        // log non-success
        this.logger.log('Webhook non-paid or unknown', { orderId, statusText, payload });
      }

      // Répond 200 à CinetPay
      return res.status(200).send('OK');
    } catch (err) {
      this.logger.error('Erreur traitement webhook CinetPay', err);
      return res.status(500).json({ ok: false });
    }
  }
}
