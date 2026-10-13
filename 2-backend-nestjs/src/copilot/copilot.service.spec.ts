import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import { of, throwError } from 'rxjs';
import { CopilotService } from './copilot.service';
import { TicketEntity } from './ticket.entity';

describe('CopilotService', () => {
  let service: CopilotService;
  const httpService = { post: jest.fn() };
  const ticketRepository = { create: jest.fn(), save: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    delete process.env.AI_SERVICE_URL;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CopilotService,
        { provide: HttpService, useValue: httpService },
        {
          provide: getRepositoryToken(TicketEntity),
          useValue: ticketRepository,
        },
      ],
    }).compile();

    service = module.get<CopilotService>(CopilotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('appelle le service IA, sauvegarde le ticket et renvoie la réponse', async () => {
    const data = { resolution_suggeree: 'Étapes' };
    httpService.post.mockReturnValue(of({ data }));
    ticketRepository.create.mockReturnValue({ id: 1 });

    const result = await service.askAiCopilot('sujet', 'description');

    expect(httpService.post).toHaveBeenCalledWith(
      'http://localhost:8000/ask-copilot',
      { sujet: 'sujet', description: 'description' },
    );
    expect(ticketRepository.create).toHaveBeenCalledWith({
      sujet: 'sujet',
      description: 'description',
      resolution_ia: 'Étapes',
    });
    expect(ticketRepository.save).toHaveBeenCalledWith({ id: 1 });
    expect(result).toBe(data);
  });

  it('utilise AI_SERVICE_URL quand elle est définie', async () => {
    process.env.AI_SERVICE_URL = 'http://ia.example/ask';
    httpService.post.mockReturnValue(
      of({ data: { resolution_suggeree: 'x' } }),
    );

    await service.askAiCopilot('s', 'd');

    expect(httpService.post).toHaveBeenCalledWith(
      'http://ia.example/ask',
      expect.anything(),
    );
  });

  it('lève une HttpException 500 et ne sauvegarde rien si le service IA échoue', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    httpService.post.mockReturnValue(throwError(() => new Error('boom')));

    await expect(service.askAiCopilot('s', 'd')).rejects.toBeInstanceOf(
      HttpException,
    );
    expect(ticketRepository.save).not.toHaveBeenCalled();
  });
});
