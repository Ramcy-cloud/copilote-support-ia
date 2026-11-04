import { BadRequestException } from '@nestjs/common';

/**
 * Texte obligatoire, non vide, de longueur bornée.
 * Partagé par les contrôleurs : toute entrée utilisateur passe par ici avant
 * d'atteindre la base, le LLM ou bcrypt.
 */
export function texteValide(
  valeur: unknown,
  champ: string,
  max: number,
): string {
  if (typeof valeur !== 'string' || valeur.trim() === '') {
    throw new BadRequestException(`${champ} est obligatoire`);
  }
  if (valeur.length > max) {
    throw new BadRequestException(`${champ} dépasse ${max} caractères`);
  }
  return valeur;
}
