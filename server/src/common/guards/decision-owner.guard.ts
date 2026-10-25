import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { AuthenticatedRequest } from '../types/authenticated-request.interface.js';

// Shared guard for DecisionsModule. Register the Decision schema in the module
// that uses this guard or provide the model token globally as documented below.
@Injectable()
export class DecisionOwnerGuard implements CanActivate {
  constructor(@InjectModel('Decision') private readonly decisionModel: Model<Record<string, unknown>>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) throw new ForbiddenException('You do not have permission to modify this decision');
    const rawId = request.params.id;
    const id = Number(rawId);
    if (!Number.isSafeInteger(id) || id <= 0) throw new NotFoundException('Decision not found');
    const decision = await this.decisionModel.findOne({ id }).select({ ownerId: 1 }).lean().exec();
    if (!decision) throw new NotFoundException('Decision not found');
    if (Number(decision.ownerId) !== user.id) {
      throw new ForbiddenException('You do not have permission to modify this decision');
    }
    return true;
  }
}
