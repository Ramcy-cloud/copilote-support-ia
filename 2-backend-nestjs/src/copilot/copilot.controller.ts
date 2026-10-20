import { BadRequestException, Controller, Post, Body } from '@nestjs/common';
import { CopilotAnswer, CopilotService } from './copilot.service';

export const MAX_SUJET = 200;
export const MAX_DESCRIPTION = 5000;

/** Texte obligatoire, non vide, de longueur bornée (le texte est envoyé au LLM). */
function texteValide(valeur: unknown, champ: string, max: number): string {
  if (typeof valeur !== 'string' || valeur.trim() === '') {
    throw new BadRequestException(`${champ} est obligatoire`);
  }
  if (valeur.length > max) {
    throw new BadRequestException(`${champ} dépasse ${max} caractères`);
  }
  return valeur;
}

@Controller('copilot')
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
