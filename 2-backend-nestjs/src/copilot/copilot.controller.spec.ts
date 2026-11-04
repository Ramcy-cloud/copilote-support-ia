import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CopilotController } from './copilot.controller';
import { CopilotService } from './copilot.service';

describe('CopilotController', () => {
  let controller: CopilotController;
  const copilotService = { askAiCopilot: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CopilotController],
      providers: [{ provide: CopilotService, useValue: copilotService }],
    })
      // Test unitaire du contrôleur : l'authentification est couverte par
      // auth.service.spec.ts et test/auth.e2e-spec.ts.
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CopilotController>(CopilotController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('délègue la question au service et renvoie sa réponse', async () => {
    const reponse = { resolution_suggeree: 'Étapes' };
    copilotService.askAiCopilot.mockResolvedValue(reponse);

    await expect(controller.askCopilot('sujet', 'desc')).resolves.toBe(reponse);
    expect(copilotService.askAiCopilot).toHaveBeenCalledWith('sujet', 'desc');
  });
});
