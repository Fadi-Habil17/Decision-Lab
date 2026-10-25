import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('templates')
@Controller('templates')
export class TemplatesController {}
