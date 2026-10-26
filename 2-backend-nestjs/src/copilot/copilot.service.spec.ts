import { Test, TestingModule } from '@nestjs/testing';
import {
  BadGatewayException,
  GatewayTimeoutException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AxiosError, AxiosHeaders } from 'axios';
import { of, throwError } from 'rxjs';
import { CopilotService } from './copilot.service';
import { TicketEntity } from './ticket.entity';

function erreurHttp(status: number) {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError(
    'échec',
    'ERR_BAD_RESPONSE',
    config,
    {},
    {
      status,
      statusText: '',
      headers: {},
      config,
      data: { detail: 'interne' },
    },
  );
}

describe('CopilotService', () => {
  let service: CopilotService;
  const httpService = { post: jest.fn() };
  const ticketRepository = { create: jest.fn(), save: jest.fn() };
  const reponsePython = {
    status: 'success',
    sujet_analyse: 'sujet',
    resolution_suggeree: 'Étapes',
    prompt_utilise: 'prompt interne secret',
    simulated: false,
  };

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
    module.useLogger(false);

    service = module.get<CopilotService>(CopilotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('appelle le service IA, sauvegarde le ticket et renvoie la réponse sans le prompt', async () => {
    httpService.post.mockReturnValue(of({ data: reponsePython }));
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
    expect(result).toEqual({
      status: 'success',
      sujet_analyse: 'sujet',
      resolution_suggeree: 'Étapes',
      simulated: false,
    });
    expect(result).not.toHaveProperty('prompt_utilise');
  });

  it('transmet le drapeau simulated du service IA', async () => {
    httpService.post.mockReturnValue(
      of({ data: { ...reponsePython, simulated: true } }),
    );
    const result = await service.askAiCopilot('s', 'd');
    expect(result.simulated).toBe(true);
  });

  it('utilise AI_SERVICE_URL quand elle est définie', async () => {
    process.env.AI_SERVICE_URL = 'http://ia.example/ask';
    httpService.post.mockReturnValue(of({ data: reponsePython }));

    await service.askAiCopilot('s', 'd');

    expect(httpService.post).toHaveBeenCalledWith(
      'http://ia.example/ask',
      expect.anything(),
    );
  });

  it('renvoie quand même la réponse si la sauvegarde échoue', async () => {
    httpService.post.mockReturnValue(of({ data: reponsePython }));
    ticketRepository.create.mockReturnValue({ id: 1 });
    ticketRepository.save.mockRejectedValue(new Error('no such table'));

    await expect(service.askAiCopilot('s', 'd')).resolves.toMatchObject({
      resolution_suggeree: 'Étapes',
    });
  });

  it.each([
    [503, ServiceUnavailableException],
    [502, BadGatewayException],
    [500, BadGatewayException],
    [422, BadGatewayException],
  ])(
    'traduit un HTTP %i du service IA en erreur précise, sans sauvegarde',
    async (status, classe) => {
      httpService.post.mockReturnValue(throwError(() => erreurHttp(status)));

      await expect(service.askAiCopilot('s', 'd')).rejects.toBeInstanceOf(
        classe,
      );
      expect(ticketRepository.save).not.toHaveBeenCalled();
    },
  );

  it('répond 503 si le service IA est injoignable', async () => {
    httpService.post.mockReturnValue(
      throwError(() => new AxiosError('refusé', 'ECONNREFUSED')),
    );
    await expect(service.askAiCopilot('s', 'd')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('répond 504 si le service IA dépasse le délai', async () => {
    httpService.post.mockReturnValue(
      throwError(() => new AxiosError('délai', 'ECONNABORTED')),
    );
    await expect(service.askAiCopilot('s', 'd')).rejects.toBeInstanceOf(
      GatewayTimeoutException,
    );
  });

  it('répond 502 si la réponse du service IA est inexploitable', async () => {
    httpService.post.mockReturnValue(of({ data: { status: 'success' } }));
    await expect(service.askAiCopilot('s', 'd')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(ticketRepository.save).not.toHaveBeenCalled();
  });
});
