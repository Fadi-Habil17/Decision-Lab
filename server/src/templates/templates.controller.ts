import {
  applyDecorators,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { InternalToolGuard } from '../auth/internal-tool.guard.js';
import { CreateTemplateDto } from './dto/create-template.dto.js';
import { TemplateResponseDto } from './dto/template-response.dto.js';
import { UpdateTemplateDto } from './dto/update-template.dto.js';
import { TemplatesService } from './templates.service.js';

const TemplateMutation = () =>
  applyDecorators(
    UseGuards(InternalToolGuard),
    ApiSecurity('access-token'),
    ApiSecurity('internal-tool-key'),
    ApiHeader({
      name: 'x-internal-tool-key',
      required: false,
      description:
        'Internal tool key. Alternatively authenticate as an Admin with Bearer JWT.',
    }),
    ApiForbiddenResponse({
      description: 'Admin role or valid internal tool key required.',
    }),
  );

const TemplateId = () =>
  ApiParam({
    name: 'id',
    schema: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
    description: 'Numeric template application ID.',
  });

@ApiTags('templates')
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List available decision templates (public)' })
  @ApiOkResponse({ type: TemplateResponseDto, isArray: true })
  findAll() {
    return this.templates.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one decision template (public)' })
  @TemplateId()
  @ApiOkResponse({ type: TemplateResponseDto })
  @ApiBadRequestResponse({
    description: 'Template ID must be a positive safe integer.',
  })
  @ApiNotFoundResponse({ description: 'Template not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.templates.findOne(id);
  }

  @Post()
  @TemplateMutation()
  @ApiOperation({ summary: 'Create a template (Admin or internal key)' })
  @ApiBody({ type: CreateTemplateDto })
  @ApiCreatedResponse({ type: TemplateResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid template data or weights do not total 100.',
  })
  @ApiConflictResponse({
    description: 'Criterion names must be unique within the template.',
  })
  create(@Body() dto: CreateTemplateDto) {
    return this.templates.create(dto);
  }

  @Patch(':id')
  @TemplateMutation()
  @TemplateId()
  @ApiOperation({
    summary:
      'Update a template without changing existing decisions (Admin or internal key)',
  })
  @ApiBody({ type: UpdateTemplateDto })
  @ApiOkResponse({ type: TemplateResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid template data, empty update, ID, or weight total.',
  })
  @ApiNotFoundResponse({ description: 'Template not found.' })
  @ApiConflictResponse({
    description: 'Criterion names must be unique within the template.',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templates.update(id, dto);
  }

  @Delete(':id')
  @TemplateMutation()
  @TemplateId()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Delete a template while keeping decision snapshots (Admin or internal key)',
  })
  @ApiNoContentResponse({ description: 'Template deleted.' })
  @ApiBadRequestResponse({
    description: 'Template ID must be a positive safe integer.',
  })
  @ApiNotFoundResponse({ description: 'Template not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.templates.remove(id);
  }
}
