import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async createGroup(data: {
    ownerId: string;
    serviceName: string;
    plan: string;
    pricePerSlot: number;
    totalSlots: number;
  }) {
    const group = await this.prisma.subscriptionGroup.create({
      data: {
        ownerId: data.ownerId,
        serviceName: data.serviceName,
        plan: data.plan,
        pricePerSlot: data.pricePerSlot,
        totalSlots: data.totalSlots,
        availableSlots: data.totalSlots,
      },
    });
    return group;
  }

  async search(serviceQuery: string) {
    return this.prisma.subscriptionGroup.findMany({
      where: {
        serviceName: {
          contains: serviceQuery,
          mode: 'insensitive',
        },
        availableSlots: { gt: 0 },
      },
      include: { owner: { select: { id: true, name: true, phone: true, kycStatus: true } } },
    });
  }

  async getById(id: string) {
    const group = await this.prisma.subscriptionGroup.findUnique({ where: { id }, include: { owner: true }});
    if (!group) throw new NotFoundException('Groupe non trouvé');
    return group;
  }
}
