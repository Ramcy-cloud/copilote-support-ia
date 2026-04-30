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
      synchronize: true, // Génère les tables automatiquement (super pour le dev)
    }),
    CopilotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}