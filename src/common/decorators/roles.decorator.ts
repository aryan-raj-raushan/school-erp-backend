import { SetMetadata } from '@nestjs/common';
import { AnyRole } from '../../shared/enums';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AnyRole[]) => SetMetadata(ROLES_KEY, roles);
