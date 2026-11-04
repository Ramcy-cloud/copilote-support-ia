import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { JwtPayload } from './auth.service';

export interface RequeteAuthentifiee extends Request {
  utilisateur?: JwtPayload;
}

/** Exige un en-tête « Authorization: Bearer <jeton> » valide et non expiré. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requete = context.switchToHttp().getRequest<RequeteAuthentifiee>();
    const [schema, jeton] = (requete.headers.authorization ?? '').split(' ');

    if (schema !== 'Bearer' || !jeton) {
      throw new UnauthorizedException('Jeton d\u2019authentification manquant');
    }

    try {
      requete.utilisateur = await this.jwt.verifyAsync<JwtPayload>(jeton);
    } catch {
      // Signature invalide, jeton expiré ou malformé : aucune distinction publique.
      throw new UnauthorizedException('Jeton invalide ou expiré');
    }
    return true;
  }
}
