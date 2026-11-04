import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { compare } from 'bcryptjs';
import { AuthService, MIN_MOT_DE_PASSE } from './auth.service';
import { UserEntity } from './user.entity';

describe('AuthService', () => {
  const MOT_DE_PASSE = 'mot-de-passe-de-test-valide';
  let service: AuthService;
  const depot = { findOne: jest.fn() };
  const jwt = { signAsync: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(UserEntity), useValue: depot },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('produit une empreinte bcrypt vérifiable et jamais le mot de passe en clair', async () => {
    const empreinte = await AuthService.hacherMotDePasse(MOT_DE_PASSE);
    expect(empreinte).not.toContain(MOT_DE_PASSE);
    expect(empreinte.startsWith('$2')).toBe(true);
    await expect(compare(MOT_DE_PASSE, empreinte)).resolves.toBe(true);
    await expect(compare('autre-mot-de-passe', empreinte)).resolves.toBe(false);
  });

  it('signe un jeton portant l’identifiant pour des identifiants valides', async () => {
    depot.findOne.mockResolvedValue({
      id: 7,
      identifiant: 'technicien',
      mot_de_passe_hash: await AuthService.hacherMotDePasse(MOT_DE_PASSE),
    });
    jwt.signAsync.mockResolvedValue('jeton-signe');

    await expect(service.login('technicien', MOT_DE_PASSE)).resolves.toEqual({
      access_token: 'jeton-signe',
      expires_in: expect.any(String) as string,
    });
    expect(jwt.signAsync).toHaveBeenCalledWith({
      sub: 7,
      identifiant: 'technicien',
    });
  });

  it('refuse un mot de passe faux sans signer de jeton', async () => {
    depot.findOne.mockResolvedValue({
      id: 7,
      identifiant: 'technicien',
      mot_de_passe_hash: await AuthService.hacherMotDePasse(MOT_DE_PASSE),
    });

    await expect(
      service.login('technicien', 'mauvais-mot-de-passe'),
    ).rejects.toThrow(UnauthorizedException);
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('renvoie le même message pour un compte inconnu que pour un mot de passe faux', async () => {
    depot.findOne.mockResolvedValue(null);

    const erreur = await service
      .login('inconnu', MOT_DE_PASSE)
      .catch((e: Error) => e);

    expect(erreur).toBeInstanceOf(UnauthorizedException);
    // Ne doit pas révéler que le compte n'existe pas (énumération d'utilisateurs).
    expect((erreur as Error).message).toBe('Identifiants invalides');
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('impose une longueur minimale de mot de passe cohérente avec la création de compte', () => {
    expect(MIN_MOT_DE_PASSE).toBeGreaterThanOrEqual(12);
  });
});
