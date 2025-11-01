import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async register(dto: any) {
    
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email }});
    if (exists) throw new ConflictException('Un compte existe deja avec cet Email');

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        password: hashed,
        role: dto.role,
      },
    });
    // ne renvoie pas le mot de passe
    const { password, ...rest } = user as any;
    return rest;
  }

  async login(dto: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email }});
    if (!user) throw new UnauthorizedException('Identifiants invalides');
    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) throw new UnauthorizedException('Identifiants invalides');

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const { password, ...rest } = user as any;
    return { user: rest, token };
  }

  // KYC upload (simple: store url and mark PENDING)
  async uploadKyc(userId: string, documentUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { kycStatus: 'PENDING' }, // stocker document dans S3 puis admin valide via dashboard
    });
  }

  // Admin function to set KYC
  async setKycStatus(userId: string, status: 'VERIFIED' | 'REJECTED') {
    return this.prisma.user.update({
      where: { id: userId },
      data: { kycStatus: status },
    });
  }
}
