import { Request } from 'express';
import { JwtPayload } from './jwt-payload';

export type AuthenticatedRequest = Request & { user: JwtPayload };
