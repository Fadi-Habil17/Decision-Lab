import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule, ObserveInstrument, observeEnabled } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
    observeEnabled ? { instrument: ObserveInstrument } : {},
  );

  const configuration = new DocumentBuilder()
    .setTitle('DecisionLab API')
    .setDescription(
      'Decision calculation and lifecycle endpoints. Shared contract choices remain provisional until team confirmation.',
    )
    .setVersion('0.1.0')
    .build();

  const document = SwaggerModule.createDocument(app, configuration);

  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

await bootstrap();
