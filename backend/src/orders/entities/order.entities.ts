import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  buyerPhone: string;

  @Column()
  sellerPhone: string;

  @Column()
  serviceName: string;

  @Column({ default: 'pending' })
  status: 'pending' | 'confirmed' | 'refunded';

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date;

  @Column({ type: 'numeric', default: 0 })
  commission: number;

  @Column({ nullable: true })
  paymentReference: string;
}