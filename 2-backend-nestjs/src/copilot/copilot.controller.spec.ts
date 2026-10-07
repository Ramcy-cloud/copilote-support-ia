import { Test, TestingModule } from '@nestjs/testing';
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
    }).compile();

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
