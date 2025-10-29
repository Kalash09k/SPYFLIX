import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ 
    type: 'decimal',
    precision: 10,  
    scale: 2,       
    transformer: {  
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    }
  })
  amount: number;
}