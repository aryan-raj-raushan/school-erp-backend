import { SetMetadata } from '@nestjs/common';
import type { PlatformPermission } from '../../shared/constants/platform-permissions';

export const PLATFORM_PERMISSIONS_KEY = 'platformPermissions';

export const PlatformPermissions = (...permissions: PlatformPermission[]) =>
  SetMetadata(PLATFORM_PERMISSIONS_KEY, permissions);
