import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

/** Compte autorisé à interroger le copilote. Aucun mot de passe en clair n'est stocké. */
@Entity('utilisateurs')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  identifiant: string;

  /** Empreinte bcrypt (coût 12), jamais renvoyée par l'API. */
  @Column()
  mot_de_passe_hash: string;

  @CreateDateColumn()
  date_creation: Date;
}
