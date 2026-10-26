import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CopilotModule } from './copilot/copilot.module';

@Module({
  imports: [
    // Fabrique asynchrone : l'environnement est lu au démarrage de l'application
    // (et non à l'import du fichier), ce qui permet aux tests d'utiliser ':memory:'.
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'sqlite' as const,
        database: process.env.DB_PATH ?? 'database.sqlite',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        // La table est créée par la migration au premier démarrage.
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsRun: true,
        // synchronize modifie le schéma au démarrage (et peut supprimer des colonnes/données) :
        // désactivé par défaut, activable uniquement en dev avec DB_SYNCHRONIZE=true.
        synchronize: process.env.DB_SYNCHRONIZE === 'true',
      }),
    }),
    CopilotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
