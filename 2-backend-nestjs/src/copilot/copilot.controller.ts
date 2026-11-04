import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { texteValide } from '../validation';
import { CopilotAnswer, CopilotService } from './copilot.service';

export const MAX_SUJET = 200;
export const MAX_DESCRIPTION = 5000;

/**
 * Route authentifiée : le quota du LLM et l'historique des incidents ne sont
 * pas publics. Le garde s'exécute avant la validation, donc une requête sans
 * jeton reçoit 401 et non 400.
 */
@Controller('copilot')
@UseGuards(JwtAuthGuard)
export class CopilotController {
  constructor(private readonly copilotService: CopilotService) {}

  @Post('ask')
  async askCopilot(
    @Body('sujet') sujet: unknown,
    @Body('description') description: unknown,
  ): Promise<CopilotAnswer> {
    return this.copilotService.askAiCopilot(
      texteValide(sujet, 'sujet', MAX_SUJET),
      texteValide(description, 'description', MAX_DESCRIPTION),
    );
  }
}
