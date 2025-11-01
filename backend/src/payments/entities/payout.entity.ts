import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn 
} from 'typeorm';

// Le décorateur @Entity() dit à TypeORM que cette classe correspond à une table
// dans la base de données. Par défaut, la table s'appellera 'payout'.
@Entity()
export class Payout {

  // Clé primaire auto-générée (un UUID est une bonne pratique)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // L'ID de la transaction que vous envoyez à CinetPay.
  // C'est très important pour retrouver le payout plus tard.
  @Column({ unique: true })
  transactionId: string;

  // Le statut du transfert (ex: 'PENDING', 'SUCCESS', 'FAILED')
  @Column({ default: 'PENDING' })
  status: string;

  // Le montant du transfert
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  // La devise
  @Column({ default: 'XOF' })
  currency: string;

  // Le numéro de téléphone du destinataire
  @Column()
  customerPhone: string;

  // L'ID de l'utilisateur (vendeur) qui reçoit l'argent
  @Column()
  sellerId: string;

  // Champ pour stocker la réponse complète de CinetPay (utile pour le débogage)
  @Column({ type: 'jsonb', nullable: true })
  providerResponse: any;

  // Date de création, gérée automatiquement par TypeORM
  @CreateDateColumn()
  createdAt: Date;

  // Date de la dernière mise à jour, gérée automatiquement par TypeORM
  @UpdateDateColumn()
  updatedAt: Date;
}
