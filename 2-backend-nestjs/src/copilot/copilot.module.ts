import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CopilotService } from './copilot.service';
import { CopilotController } from './copilot.controller';
import { TicketEntity } from './ticket.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([TicketEntity]) // Ajout de la table
  ],
  providers: [CopilotService],
  controllers: [CopilotController]
})
export class CopilotModule {}