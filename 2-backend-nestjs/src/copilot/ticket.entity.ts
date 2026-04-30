import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('tickets_historique')
export class TicketEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sujet: string;

  @Column('text')
  description: string;

  @Column('text')
  resolution_ia: string;

  @CreateDateColumn()
  date_creation: Date;
}