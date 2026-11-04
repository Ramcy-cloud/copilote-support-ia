import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { authConfigFromEnv } from './auth.config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UserEntity } from './user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    // Fabrique asynchrone : JWT_SECRET est lu au démarrage de l'application,
    // pas à l'import du fichier, comme pour la connexion TypeORM.
    JwtModule.registerAsync({
      useFactory: () => {
        const { secret, expiresIn } = authConfigFromEnv();
        return { secret, signOptions: { expiresIn } };
      },
    }),
  ],
  providers: [AuthService, JwtAuthGuard],
  controllers: [AuthController],
  // JwtModule est réexporté pour que JwtAuthGuard reste injectable ailleurs.
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
