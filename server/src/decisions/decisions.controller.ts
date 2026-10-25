import {
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
  Put,
  Query,
  UseGuards,
  applyDecorators,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { SafeUser } from '../users/users.service.js';
import { DecisionsService } from './decisions.service.js';
import {
  CreateCriterionDto,
  CreateDecisionDto,
  CreateOptionDto,
  ListDecisionsQueryDto,
  UpdateCriterionDto,
  UpdateDecisionDto,
  UpdateOptionDto,
  UpsertScoreDto,
} from './dto/decision.dto.js';

const ERROR_TEXT = {
  400: 'Invalid input (validation failed, bad reference, or limit reached)',
  401: 'Missing, invalid or expired access token',
  403: 'You do not have permission to modify this decision (not the owner)',
  404: 'Decision (or option/criterion/template) not found',
  409: 'Duplicate name, or the decision is Finalized (locked)',
} as const;

const errors = (...codes: (keyof typeof ERROR_TEXT)[]) =>
  applyDecorators(...codes.map((status) => ApiResponse({ status, description: ERROR_TEXT[status] })));

const Authenticated = () => applyDecorators(UseGuards(JwtAuthGuard), ApiBearerAuth());


@ApiTags('Decisions')
@Controller('decisions')
export class DecisionsController {
  constructor(private readonly service: DecisionsService) {}

  // ---------------------------------------------------------------- decisions

  @Get()
  @ApiOperation({ summary: 'List decisions (public). Optional status filter and title search, newest update first' })
  @errors(400)
  list(@Query() query: ListDecisionsQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one decision with options, criteria, weights and scores (public)' })
  @errors(404)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Authenticated()
  @ApiOperation({ summary: 'Create a decision owned by the logged-in user (blank, or from a template via templateId)' })
  @errors(400, 401, 404)
  create(@Body() dto: CreateDecisionDto, @CurrentUser() user: SafeUser) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @Authenticated()
  @ApiOperation({ summary: 'Update decision title and/or description (owner only)' })
  @errors(400, 401, 403, 404, 409)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDecisionDto, @CurrentUser() user: SafeUser) {
    return this.service.update(id, dto, user.id);
  }

  @Delete(':id')
  @Authenticated()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a decision and everything inside it (owner only)' })
  @errors(401, 403, 404)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SafeUser) {
    return this.service.remove(id, user.id);
  }

  // ------------------------------------------------------------------ options

  @Post(':id/options')
  @Authenticated()
  @ApiOperation({ summary: 'Add an option to a decision (owner only)' })
  @errors(400, 401, 403, 404, 409)
  addOption(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateOptionDto, @CurrentUser() user: SafeUser) {
    return this.service.addOption(id, dto, user.id);
  }

  @Patch(':id/options/:optionId')
  @Authenticated()
  @ApiOperation({ summary: 'Rename an option (owner only)' })
  @errors(400, 401, 403, 404, 409)
  renameOption(
    @Param('id', ParseIntPipe) id: number,
    @Param('optionId', ParseIntPipe) optionId: number,
    @Body() dto: UpdateOptionDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.service.renameOption(id, optionId, dto, user.id);
  }

  @Delete(':id/options/:optionId')
  @Authenticated()
  @ApiOperation({ summary: 'Remove an option and all of its scores (owner only)' })
  @errors(401, 403, 404, 409)
  removeOption(
    @Param('id', ParseIntPipe) id: number,
    @Param('optionId', ParseIntPipe) optionId: number,
    @CurrentUser() user: SafeUser,
  ) {
    return this.service.removeOption(id, optionId, user.id);
  }

  // ----------------------------------------------------------------- criteria

  @Post(':id/criteria')
  @Authenticated()
  @ApiOperation({ summary: 'Add a criterion (name + weight) to a decision (owner only)' })
  @errors(400, 401, 403, 404, 409)
  addCriterion(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateCriterionDto, @CurrentUser() user: SafeUser) {
    return this.service.addCriterion(id, dto, user.id);
  }

  @Patch(':id/criteria/:criterionId')
  @Authenticated()
  @ApiOperation({ summary: 'Rename a criterion and/or change its weight (owner only)' })
  @errors(400, 401, 403, 404, 409)
  updateCriterion(
    @Param('id', ParseIntPipe) id: number,
    @Param('criterionId', ParseIntPipe) criterionId: number,
    @Body() dto: UpdateCriterionDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.service.updateCriterion(id, criterionId, dto, user.id);
  }

  @Delete(':id/criteria/:criterionId')
  @Authenticated()
  @ApiOperation({ summary: 'Remove a criterion and all of its scores (owner only)' })
  @errors(401, 403, 404, 409)
  removeCriterion(
    @Param('id', ParseIntPipe) id: number,
    @Param('criterionId', ParseIntPipe) criterionId: number,
    @CurrentUser() user: SafeUser,
  ) {
    return this.service.removeCriterion(id, criterionId, user.id);
  }

  // ------------------------------------------------------------------- scores

  @Put(':id/scores')
  @Authenticated()
  @ApiOperation({ summary: 'Create or update the score of one option on one criterion (owner only)' })
  @errors(400, 401, 403, 404, 409)
  upsertScore(@Param('id', ParseIntPipe) id: number, @Body() dto: UpsertScoreDto, @CurrentUser() user: SafeUser) {
    return this.service.upsertScore(id, dto, user.id);
  }

  @Delete(':id/scores/:optionId/:criterionId')
  @Authenticated()
  @ApiOperation({ summary: 'Remove a score from one option and criterion pair (owner only)' })
  @errors(401, 403, 404, 409)
  removeScore(
    @Param('id', ParseIntPipe) id: number,
    @Param('optionId', ParseIntPipe) optionId: number,
    @Param('criterionId', ParseIntPipe) criterionId: number,
    @CurrentUser() user: SafeUser,
  ) {
    return this.service.removeScore(id, optionId, criterionId, user.id);
  }
}