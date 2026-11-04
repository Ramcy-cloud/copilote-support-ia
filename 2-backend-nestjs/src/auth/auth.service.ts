import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { compare, hash } from 'bcryptjs';
import { DUREE_PAR_DEFAUT } from './auth.config';
import { UserEntity } from './user.entity';

/** Coût bcrypt : chaque incrément double le temps de calcul d'une empreinte. */
export const COUT_BCRYPT = 12;

/**
 * bcrypt ignore les octets au-delà du 72e : accepter plus long donnerait
 * l'illusion d'un mot de passe fort dont la fin ne compte pas.
 */
export const MAX_MOT_DE_PASSE = 72;
export const MIN_MOT_DE_PASSE = 12;
export const MAX_IDENTIFIANT = 64;

export interface JwtPayload {
  sub: number;
  identifiant: string;
}

export interface LoginResult {
  access_token: string;
  expires_in: string;
}

@Injectable()
export class AuthService {
  /**
   * Empreinte de rebut, comparée quand l'identifiant est inconnu. Sans elle, une
   * réponse immédiate sur identifiant inexistant et lente sur mot de passe faux
   * laisserait énumérer les comptes existants au chronomètre.
   */
  private hashDeRebut?: Promise<string>;

  constructor(
    @InjectRepository(UserEntity)
    private readonly utilisateurs: Repository<UserEntity>,
    private readonly jwt: JwtService,
  ) {}

  static hacherMotDePasse(motDePasse: string): Promise<string> {
    return hash(motDePasse, COUT_BCRYPT);
  }

  private rebut(): Promise<string> {
    // Calculée une seule fois, à la première tentative sur un compte inconnu.
    this.hashDeRebut ??= hash('identifiant-inexistant', COUT_BCRYPT);
    return this.hashDeRebut;
  }

  async login(identifiant: string, motDePasse: string): Promise<LoginResult> {
    const utilisateur = await this.utilisateurs.findOne({
      where: { identifiant },
    });
    const empreinte = utilisateur
      ? utilisateur.mot_de_passe_hash
      : await this.rebut();
    const motDePasseValide = await compare(motDePasse, empreinte);

    if (!utilisateur || !motDePasseValide) {
      // Message unique : ne distingue pas « compte inconnu » de « mot de passe faux ».
      throw new UnauthorizedException('Identifiants invalides');
    }

    const payload: JwtPayload = {
      sub: utilisateur.id,
      identifiant: utilisateur.identifiant,
    };
    return {
      access_token: await this.jwt.signAsync(payload),
      expires_in: process.env.JWT_EXPIRES_IN?.trim() || DUREE_PAR_DEFAUT,
    };
  }
}
