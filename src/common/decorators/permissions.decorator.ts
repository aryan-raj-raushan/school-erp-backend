import { SetMetadata } from '@nestjs/common';
import { AppPermission } from '../../shared/constants/permissions.registry';

export const PERMISSIONS_KEY = 'permissions';

/** Require one or more permissions on a route. Any match grants access. */
export const Permissions = (...perms: AppPermission[]) => SetMetadata(PERMISSIONS_KEY, perms);
