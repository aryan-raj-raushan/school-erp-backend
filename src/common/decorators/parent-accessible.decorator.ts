import { SetMetadata } from '@nestjs/common';

export const PARENT_ACCESSIBLE_KEY = 'isParentAccessible';
export const ParentAccessible = () => SetMetadata(PARENT_ACCESSIBLE_KEY, true);
