import { Controller, Post, Req, Res, Body, Logger, Headers } from '@nestjs/common';
import { Request, Response } from 'express';
import { WhatsAppService } from '../notifications/whatsapp.service';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entities';

@Controller('webhooks')
export class CinetpayWebhookController {

    constructor(
        private readonly whatsappService: WhatsAppService,
        @InjectRepository(Order)
        private readonly orderRepository: Repository<Order>,
    ) { }

    private readonly logger = new Logger(CinetpayWebhookController.name);

    @Post('cinetpay')
    async handleWebhook(
        @Req() req: Request,
        @Res() res: Response,
        @Headers('x-token') xToken: string,
        @Body() body: any,
    ) {
        try {
            this.logger.log('📩 Webhook reçu !');
            this.logger.log(`Headers: ${JSON.stringify(req.headers, null, 2)}`);
            this.logger.log(`🔑 x-token reçu: "${xToken}"`);
            this.logger.log(`Body: ${JSON.stringify(req.body, null, 2)}`);

            const expectedToken = process.env.CINETPAY_TOKEN;
            if (!expectedToken) {
                this.logger.error('❌ CINETPAY_TOKEN non défini dans .env');
                return res.status(500).json({ message: 'CINETPAY_TOKEN manquant côté serveur' });
            }

            if (!xToken) {
                this.logger.error('❌ Aucun x-token reçu dans les headers');
                return res.status(400).json({ message: 'x-token manquant' });
            }

            if (xToken.trim() !== expectedToken.trim()) {
                this.logger.warn(`⚠️ Token invalide. Reçu="${xToken}", attendu="${expectedToken}"`);
                return res.status(403).json({ message: 'Forbidden: Invalid token' });
            }

            const payload = req.body;
            const { transaction_id } = payload;

            if (!transaction_id) {
                this.logger.error('❌ Webhook invalide : transaction_id manquant');
                return res.status(400).json({ message: 'transaction_id manquant' });
            }

            const verifyUrl = 'https://api-checkout.cinetpay.com/v2/payment/check';
            const verifyBody = {
                apikey: process.env.CINETPAY_API_KEY,
                site_id: process.env.CINETPAY_SITE_ID,
                transaction_id,
            };

            const verifyResponse = await axios.post(verifyUrl, verifyBody, {
                headers: { 'Content-Type': 'application/json' },
            });

            const status = verifyResponse.data?.data?.status;
            this.logger.log(`🔍 Statut vérifié: ${status}`);

            if (status === 'ACCEPTED') {
                this.logger.log(`✅ Paiement confirmé pour transaction_id=${transaction_id}`);
                return res.status(200).json({ message: 'Paiement confirmé' });
            } else {
                this.logger.warn(`⚠️ Paiement non accepté pour transaction_id=${transaction_id}`);
                return res.status(400).json({ message: 'Paiement non accepté' });
            }
        } catch (err) {
            this.logger.error('💥 Erreur webhook complète ↓↓↓');
            console.error(err); // affiche toute l'erreur brute dans le terminal
            return res.status(500).json({
                message: 'Erreur serveur webhook',
                error: err instanceof Error ? err.message : String(err),
                stack: err instanceof Error ? err.stack : null,
            });
        }

    }
}