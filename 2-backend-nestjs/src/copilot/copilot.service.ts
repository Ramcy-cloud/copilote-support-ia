import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { isAxiosError } from 'axios';
import { TicketEntity } from './ticket.entity';

/** Réponse de la route POST /ask-copilot du service IA Python. */
export interface AiCopilotResponse {
  status: string;
  sujet_analyse: string;
  resolution_suggeree: string;
  prompt_utilise: string;
}

@Injectable()
export class CopilotService {
  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(TicketEntity)
    private ticketRepository: Repository<TicketEntity>,
  ) {}

  async askAiCopilot(
    sujet: string,
    description: string,
  ): Promise<AiCopilotResponse> {
    const pythonApiUrl =
      process.env.AI_SERVICE_URL ?? 'http://localhost:8000/ask-copilot';

    try {
      // 1. Appel vers l'IA en Python
      const response = await firstValueFrom(
        this.httpService.post<AiCopilotResponse>(pythonApiUrl, {
          sujet,
          description,
        }),
      );

      const resolution = response.data.resolution_suggeree;

      // 2. Sauvegarde dans la base de données SQLite
      const newTicket = this.ticketRepository.create({
        sujet: sujet,
        description: description,
        resolution_ia: resolution,
      });
      await this.ticketRepository.save(newTicket);

      // 3. Retour au Frontend
      return response.data;
    } catch (error: unknown) {
      const detail: unknown = isAxiosError(error)
        ? (error.response?.data ?? error.message)
        : error instanceof Error
          ? error.message
          : error;
      console.error("Détail de l'erreur Python :", detail);
      throw new HttpException(
        'Erreur lors de la communication avec le service IA',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
