import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TemplatesService } from './templates.service.js';

@ApiTags('templates')
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List available decision templates (public)' })
  findAll() {
    return this.templates.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one decision template (public)' })
  @ApiNotFoundResponse({ description: 'Template not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.templates.findOne(id);
  }
}
