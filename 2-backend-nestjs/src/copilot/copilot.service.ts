import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
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
  /** Vrai quand le service Python n'a pas de clé LLM : texte d'exemple, pas une vraie réponse. */
  simulated?: boolean;
}

/** Ce que l'API expose au navigateur : jamais le prompt interne ni l'historique RAG. */
export type CopilotAnswer = Pick<
  AiCopilotResponse,
  'status' | 'sujet_analyse' | 'resolution_suggeree'
> & { simulated: boolean };

@Injectable()
export class CopilotService {
  private readonly logger = new Logger(CopilotService.name);

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(TicketEntity)
    private ticketRepository: Repository<TicketEntity>,
  ) {}

  async askAiCopilot(
    sujet: string,
    description: string,
  ): Promise<CopilotAnswer> {
    // 1. Appel vers l'IA en Python (erreurs traduites en 502 / 503 / 504)
    const answer = await this.callAiService(sujet, description);

    // 2. Historique : un échec de sauvegarde ne doit pas faire perdre la réponse déjà générée
    await this.saveTicket(sujet, description, answer.resolution_suggeree);

    // 3. Retour au Frontend
    return answer;
  }

  private async callAiService(
    sujet: string,
    description: string,
  ): Promise<CopilotAnswer> {
    const pythonApiUrl =
      process.env.AI_SERVICE_URL ?? 'http://localhost:8000/ask-copilot';

    let data: Partial<AiCopilotResponse> | undefined;
    try {
      const response = await firstValueFrom(
        this.httpService.post<AiCopilotResponse>(pythonApiUrl, {
          sujet,
          description,
        }),
      );
      data = response.data;
    } catch (error: unknown) {
      throw this.toHttpException(error);
    }

    const resolution = data?.resolution_suggeree;
    if (typeof resolution !== 'string' || resolution.trim() === '') {
      this.logger.error('Réponse du service IA inexploitable');
      throw new BadGatewayException('Réponse inattendue du service IA');
    }

    // `prompt_utilise` (prompt interne, historique RAG) n'est jamais renvoyé au navigateur
    return {
      status: data?.status ?? 'success',
      sujet_analyse: data?.sujet_analyse ?? sujet,
      resolution_suggeree: resolution,
      simulated: data?.simulated === true,
    };
  }

  private async saveTicket(
    sujet: string,
    description: string,
    resolution: string,
  ): Promise<void> {
    try {
      const newTicket = this.ticketRepository.create({
        sujet,
        description,
        resolution_ia: resolution,
      });
      await this.ticketRepository.save(newTicket);
    } catch (error: unknown) {
      this.logger.error(
        "Sauvegarde de l'historique impossible (la réponse est quand même renvoyée)",
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /** Traduit une erreur d'appel au service Python en erreur HTTP précise et sans détail interne. */
  private toHttpException(error: unknown): HttpException {
    if (!isAxiosError(error)) {
      this.logger.error('Erreur inattendue', String(error));
      return new BadGatewayException('Réponse inattendue du service IA');
    }
    if (!error.response) {
      this.logger.error(
        `Service IA injoignable : ${error.code ?? error.message}`,
      );
      return error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
        ? new GatewayTimeoutException("Le service IA n'a pas répondu à temps")
        : new ServiceUnavailableException('Service IA injoignable');
    }
    this.logger.error(`Service IA : HTTP ${error.response.status}`);
    return error.response.status === 503
      ? new ServiceUnavailableException(
          "Le service IA n'est pas prêt (base de connaissances ou LLM non configurés)",
        )
      : new BadGatewayException('Le service IA a échoué');
  }
}
