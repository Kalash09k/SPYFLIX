import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../orders/entities/user.entity';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getWallet(phone: string) {
    const user = await this.userRepository.findOne({ where: { phone } });
    
    if (!user) {
      throw new NotFoundException('Vendeur introuvable');
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

  // (Optionnel) Appeler CinetPay API pour transfert vers le compte Mobile Money du vendeur
  // await axios.post('https://api-checkout.cinetpay.com/v2/payout', {...})

  return { message: 'Demande de retrait enregistrée', newBalance: user.wallet };
}

}