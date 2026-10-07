import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CopilotModule } from './copilot/copilot.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'database.sqlite',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      // synchronize modifie le schéma au démarrage (et peut supprimer des colonnes/données) :
      // désactivé par défaut, activable uniquement en dev avec DB_SYNCHRONIZE=true.
      synchronize: process.env.DB_SYNCHRONIZE === 'true',
    }),
    CopilotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}