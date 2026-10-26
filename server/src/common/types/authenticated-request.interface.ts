import type { Request } from 'express';
import type { SafeUser } from '../../users/users.service.js';

export interface AuthenticatedRequest extends Request {
  user?: SafeUser;
}
