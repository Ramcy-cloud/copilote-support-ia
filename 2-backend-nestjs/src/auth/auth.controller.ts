import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { texteValide } from '../validation';
import {
  AuthService,
  LoginResult,
  MAX_IDENTIFIANT,
  MAX_MOT_DE_PASSE,
} from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** 200 et non 201 : une connexion ne crée aucune ressource. */
  @Post('login')
  @HttpCode(200)
  async login(
    @Body('identifiant') identifiant: unknown,
    @Body('mot_de_passe') motDePasse: unknown,
  ): Promise<LoginResult> {
    return this.authService.login(
      texteValide(identifiant, 'identifiant', MAX_IDENTIFIANT),
      texteValide(motDePasse, 'mot_de_passe', MAX_MOT_DE_PASSE),
    );
  }
}
