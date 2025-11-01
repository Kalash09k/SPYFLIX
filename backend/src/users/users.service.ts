import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../orders/entities/user.entity';
import { BadRequestException } from '@nestjs/common';
import { PayoutService } from '../payments/payout.service';
import axios from 'axios';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private payoutService: PayoutService,
  ) { }

  async getWallet(phone: string) {
    const user = await this.userRepository.findOne({ where: { phone } });

    if (!user) {
      throw new NotFoundException(`Utilisateur avec numero ${phone} non trouvé`);
    }
    return { balance: user.wallet };
  }

  async requestWithdraw(phone: string, amount: number) {
    const user = await this.userRepository.findOne({ where: { phone } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    if (user.wallet < amount) {
      throw new BadRequestException('Solde insuffisant');
    }

    user.wallet -= amount;
    await this.userRepository.save(user);

    const payoutResult = await this.payoutService.sendPayout({
      phone,
      amount,
      description: `Retrait du vendeur ${phone}`,
    });

    // (Optionnel) Appeler CinetPay API pour transfert vers le compte Mobile Money du vendeur
    try {
      const response = await axios.post('https://api-checkout.cinetpay.com/v2/payout', {
        
      });
      return { message: 'Demande de retrait enregistrée', transactionId: payoutResult.transactionId, newBalance: user.wallet };
    } catch (error: any) {
      console.error('Payout failed', error);
      throw error;
    };
  };

};