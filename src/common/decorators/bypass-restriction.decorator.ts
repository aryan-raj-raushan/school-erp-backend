import { SetMetadata } from '@nestjs/common';

export const BYPASS_RESTRICTION_KEY = 'bypassRestriction';

/** Exempts a route from SchoolRestrictionGuard — for auth/billing routes a restricted school must still reach. */
export const BypassRestriction = () => SetMetadata(BYPASS_RESTRICTION_KEY, true);
