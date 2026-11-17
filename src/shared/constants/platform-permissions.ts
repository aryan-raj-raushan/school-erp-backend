import { CompanyRole } from '../enums';

export const PLATFORM_PERMISSIONS = {
  dashboard: { view: 'platform.dashboard.view' },
  schools: {
    view: 'platform.schools.view',
    manage: 'platform.schools.manage',
    adminAccess: 'platform.schools.admin_access',
    loginAs: 'platform.schools.login_as',
  },
  subscriptions: {
    view: 'platform.subscriptions.view',
    manage: 'platform.subscriptions.manage',
  },
  plans: { manage: 'platform.plans.manage' },
  billing: {
    view: 'platform.billing.view',
    manage: 'platform.billing.manage',
    approvePayments: 'platform.billing.approve_payments',
  },
  rfidInventory: { manage: 'platform.rfid_inventory.manage' },
} as const;

type Leaves<T> = T extends string ? T : { [K in keyof T]: Leaves<T[K]> }[keyof T];
export type PlatformPermission = Leaves<typeof PLATFORM_PERMISSIONS>;

export const PLATFORM_PERMISSION_CATALOG: Array<{
  module: string;
  permissions: Array<{ slug: PlatformPermission; label: string }>;
}> = [
  {
    module: 'Dashboard',
    permissions: [{ slug: PLATFORM_PERMISSIONS.dashboard.view, label: 'View platform dashboard' }],
  },
  {
    module: 'Schools',
    permissions: [
      { slug: PLATFORM_PERMISSIONS.schools.view, label: 'View schools' },
      { slug: PLATFORM_PERMISSIONS.schools.manage, label: 'Edit school details' },
      {
        slug: PLATFORM_PERMISSIONS.schools.adminAccess,
        label: 'View admin login / reset admin password',
      },
      { slug: PLATFORM_PERMISSIONS.schools.loginAs, label: 'Log in as a school' },
    ],
  },
  {
    module: 'Subscriptions',
    permissions: [
      { slug: PLATFORM_PERMISSIONS.subscriptions.view, label: 'View subscriptions' },
      {
        slug: PLATFORM_PERMISSIONS.subscriptions.manage,
        label: 'Create, change and cancel subscriptions',
      },
    ],
  },
  {
    module: 'Plans',
    permissions: [{ slug: PLATFORM_PERMISSIONS.plans.manage, label: 'View and manage plans' }],
  },
  {
    module: 'Billing',
    permissions: [
      { slug: PLATFORM_PERMISSIONS.billing.view, label: 'View invoices and charges' },
      { slug: PLATFORM_PERMISSIONS.billing.manage, label: 'Create invoices and charges' },
      { slug: PLATFORM_PERMISSIONS.billing.approvePayments, label: 'Approve or reject payments' },
    ],
  },
  {
    module: 'RFID Inventory',
    permissions: [
      { slug: PLATFORM_PERMISSIONS.rfidInventory.manage, label: 'Manage RFID devices' },
    ],
  },
];

export const ALL_PLATFORM_PERMISSIONS: PlatformPermission[] = PLATFORM_PERMISSION_CATALOG.flatMap(
  (group) => group.permissions.map((p) => p.slug),
);

const P = PLATFORM_PERMISSIONS;

export const BUILT_IN_PLATFORM_PERMISSIONS: Record<CompanyRole, PlatformPermission[]> = {
  [CompanyRole.SUPER_ADMIN]: ALL_PLATFORM_PERMISSIONS,
  [CompanyRole.ADMIN]: [
    P.dashboard.view,
    P.schools.view,
    P.schools.manage,
    P.schools.adminAccess,
    P.schools.loginAs,
    P.subscriptions.view,
    P.subscriptions.manage,
    P.plans.manage,
    P.billing.view,
    P.billing.manage,
  ],
  [CompanyRole.SUPPORT]: [P.dashboard.view, P.schools.view, P.subscriptions.view, P.billing.view],
  [CompanyRole.SALES]: [
    P.dashboard.view,
    P.schools.view,
    P.schools.manage,
    P.schools.loginAs,
    P.subscriptions.view,
    P.billing.view,
    P.billing.manage,
    P.billing.approvePayments,
  ],
  [CompanyRole.OPERATOR]: [
    P.dashboard.view,
    P.schools.view,
    P.schools.manage,
    P.schools.loginAs,
    P.subscriptions.view,
    P.billing.view,
    P.billing.manage,
    P.billing.approvePayments,
    P.rfidInventory.manage,
  ],
};
