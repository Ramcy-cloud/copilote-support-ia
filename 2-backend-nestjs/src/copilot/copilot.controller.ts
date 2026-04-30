import { Controller, Post, Body } from '@nestjs/common';
import { CopilotService } from './copilot.service';

@Controller('copilot')
export class CopilotController {
  constructor(private readonly copilotService: CopilotService) {}

  @Post('ask')
  async askCopilot(
    @Body('sujet') sujet: string,
    @Body('description') description: string,
  ) {
    return this.copilotService.askAiCopilot(sujet, description);
  }
}