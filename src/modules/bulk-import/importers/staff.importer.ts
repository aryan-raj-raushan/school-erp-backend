import { Injectable } from '@nestjs/common';
import { StaffService } from '../../staff/staff.service';
import { CreateStaffDto } from '../../staff/dto/create-staff.dto';
import { Gender, SchoolRole } from '../../../shared/enums';
import { generateTempPassword } from '../../../utils/hash.utils';
import { BulkImportRepository, StaffUniqueField } from '../bulk-import.repository';
import { BulkImportLookups } from '../bulk-import.lookups';
import {
  BulkImporter,
  ImportColumn,
  PersistResult,
  RowContext,
  RowValues,
  UniqueKey,
  ValidatedRow,
} from '../bulk-import.types';
import {
  bloodGroupOptions,
  enumOptions,
  flag,
  lower,
  todayIst,
  yearsBetween,
} from '../bulk-import.utils';

type Role = Awaited<ReturnType<BulkImportLookups['roles']>>[number];

interface StaffContext {
  roles: Role[];
  today: string;
}

const EXCLUDED_ROLE_SLUGS = new Set(['school_admin']);
const SYSTEM_ROLES = new Set<string>(Object.values(SchoolRole));

function str(value: unknown): string | undefined {
  return value === undefined || value === null || value === '' ? undefined : String(value);
}

function fullName(payload: CreateStaffDto): string {
  return [payload.first_name, payload.last_name].filter(Boolean).join(' ');
}

@Injectable()
export class StaffImporter implements BulkImporter<StaffContext, CreateStaffDto> {
  readonly entity = 'staff' as const;
  readonly label = 'Staff';
  readonly dto = CreateStaffDto;

  readonly fieldColumns: Record<string, string> = {
    first_name: 'first_name',
    last_name: 'last_name',
    phone_number: 'phone_number',
    email: 'email',
    date_of_birth: 'date_of_birth',
    joining_date: 'joining_date',
    employee_code: 'employee_code',
    rfid_card_number: 'rfid_card_number',
    qualification: 'qualification',
    father_name: 'father_name',
    husband_name: 'husband_name',
    city: 'city',
  };

  readonly uniqueKeys: UniqueKey<CreateStaffDto>[] = [
    {
      label: 'phone number',
      column: 'phone_number',
      severity: 'error',
      key: (p) => p.phone_number,
    },
    { label: 'email', column: 'email', severity: 'error', key: (p) => p.email },
    {
      label: 'employee code',
      column: 'employee_code',
      severity: 'error',
      key: (p) => p.employee_code,
    },
    {
      label: 'RFID card number',
      column: 'rfid_card_number',
      severity: 'error',
      key: (p) => p.rfid_card_number,
    },
  ];

  constructor(
    private readonly repo: BulkImportRepository,
    private readonly lookups: BulkImportLookups,
    private readonly staffService: StaffService,
  ) {}

  async loadContext(schoolId: string): Promise<StaffContext> {
    const roles = await this.lookups.roles(schoolId);
    return {
      roles: roles.filter((r) => !EXCLUDED_ROLE_SLUGS.has(r.slug)),
      today: todayIst(),
    };
  }

  columns(ctx: StaffContext): ImportColumn[] {
    return [
      {
        key: 'first_name',
        header: 'First Name',
        kind: 'text',
        required: true,
        maxLength: 100,
        hint: 'Staff first name',
      },
      { key: 'last_name', header: 'Last Name', kind: 'text', maxLength: 100, hint: 'Surname' },
      {
        key: 'phone_number',
        header: 'Mobile Number',
        kind: 'phone',
        required: true,
        hint: '10-digit Indian mobile. Used to sign in, so it must be unique.',
      },
      { key: 'email', header: 'Email', kind: 'email', hint: 'Optional, must be unique' },
      {
        key: 'role',
        header: 'Role',
        kind: 'enum',
        required: true,
        options: ctx.roles.map((r) => ({ value: r.id, label: r.name, aliases: [r.slug] })),
        hint: 'Role / designation as set up under School → Roles. Decides what they can access.',
        width: 22,
      },
      {
        key: 'gender',
        header: 'Gender',
        kind: 'enum',
        options: enumOptions(Object.values(Gender), { MALE: ['M'], FEMALE: ['F'] }),
        hint: 'Male, Female or Other',
      },
      { key: 'date_of_birth', header: 'Date of Birth', kind: 'date', hint: 'Must be in the past' },
      {
        key: 'joining_date',
        header: 'Joining Date',
        kind: 'date',
        hint: 'Date of joining the school',
      },
      {
        key: 'employee_code',
        header: 'Employee Code',
        kind: 'text',
        maxLength: 50,
        hint: 'Optional, must be unique',
      },
      {
        key: 'blood_group',
        header: 'Blood Group',
        kind: 'enum',
        options: bloodGroupOptions(),
        hint: 'e.g. A+, O-',
      },
      {
        key: 'qualification',
        header: 'Qualification',
        kind: 'text',
        maxLength: 255,
        hint: 'e.g. M.Sc, B.Ed',
      },
      {
        key: 'total_experience',
        header: 'Total Experience',
        kind: 'text',
        maxLength: 100,
        hint: 'e.g. 5 years',
      },
      {
        key: 'previous_employer',
        header: 'Previous Employer',
        kind: 'text',
        maxLength: 255,
        hint: 'Optional',
      },
      {
        key: 'previous_role',
        header: 'Previous Role',
        kind: 'text',
        maxLength: 100,
        hint: 'Optional',
      },
      { key: 'father_name', header: 'Father Name', kind: 'text', maxLength: 100, hint: 'Optional' },
      {
        key: 'husband_name',
        header: 'Husband Name',
        kind: 'text',
        maxLength: 100,
        hint: 'Optional',
      },
      {
        key: 'address',
        header: 'Current Address',
        kind: 'text',
        maxLength: 500,
        hint: 'Optional',
        width: 30,
      },
      {
        key: 'permanent_address',
        header: 'Permanent Address',
        kind: 'text',
        maxLength: 500,
        hint: 'Optional',
        width: 30,
      },
      { key: 'city', header: 'City', kind: 'text', maxLength: 100, hint: 'Optional' },
      {
        key: 'rfid_card_number',
        header: 'RFID Card Number',
        kind: 'text',
        maxLength: 50,
        hint: 'Optional, must be unique',
      },
    ];
  }

  examples(ctx: StaffContext): RowValues[] {
    const roleNamed = (slug: string, fallback: number) =>
      (ctx.roles.find((r) => r.slug === slug) ?? ctx.roles[fallback] ?? ctx.roles[0])?.name ?? '';
    return [
      {
        first_name: 'Neha',
        last_name: 'Gupta',
        phone_number: '9812345670',
        email: 'neha.gupta@example.com',
        role: roleNamed('teacher', 0),
        gender: 'Female',
        date_of_birth: '1990-05-15',
        joining_date: '2022-04-01',
        employee_code: 'EMP-101',
        qualification: 'M.Sc, B.Ed',
        total_experience: '8 years',
        city: 'Jaipur',
      },
      {
        first_name: 'Ravi',
        last_name: 'Kumar',
        phone_number: '9876501234',
        role: roleNamed('accountant', 1),
        gender: 'Male',
        joining_date: '01-07-2023',
        employee_code: 'EMP-102',
        blood_group: 'O+',
      },
    ];
  }

  notes(): string[] {
    return [
      'Each new staff member gets a unique temporary password, shown after the import. They must change it at first sign-in.',
      'School Admin accounts cannot be created through import.',
    ];
  }

  toPayload(row: RowContext, ctx: StaffContext): CreateStaffDto | undefined {
    const v = row.values;
    const role = ctx.roles.find((r) => r.id === v.role);

    if (v.date_of_birth) {
      const dob = String(v.date_of_birth);
      if (dob > ctx.today) {
        row.issue('date_of_birth', 'Date of birth cannot be in the future');
      } else {
        const age = yearsBetween(dob, ctx.today);
        if (age < 18 || age > 80) {
          row.issue(
            'date_of_birth',
            `Staff member would be ${age} years old — please double-check`,
            'warning',
          );
        }
      }
      if (v.joining_date && String(v.joining_date) <= dob) {
        row.issue('joining_date', 'Joining date must be after the date of birth');
      }
    }
    if (v.joining_date && String(v.joining_date) > ctx.today) {
      row.issue('joining_date', 'Joining date is in the future', 'warning');
    }

    if (!role) return undefined;
    const systemRole = role.is_system && SYSTEM_ROLES.has(role.slug.toUpperCase());
    return {
      first_name: String(v.first_name ?? ''),
      last_name: str(v.last_name),
      dial_code: '+91',
      phone_number: String(v.phone_number ?? ''),
      email: str(v.email),
      role: systemRole ? (role.slug.toUpperCase() as SchoolRole) : undefined,
      custom_role_id: systemRole ? undefined : role.id,
      gender: str(v.gender),
      date_of_birth: str(v.date_of_birth),
      joining_date: str(v.joining_date),
      employee_code: str(v.employee_code),
      blood_group: str(v.blood_group),
      qualification: str(v.qualification),
      total_experience: str(v.total_experience),
      previous_employer: str(v.previous_employer),
      previous_role: str(v.previous_role),
      father_name: str(v.father_name),
      husband_name: str(v.husband_name),
      address: str(v.address),
      permanent_address: str(v.permanent_address),
      city: str(v.city),
      rfid_card_number: str(v.rfid_card_number),
      is_active: true,
    } as CreateStaffDto;
  }

  async checkExisting(
    rows: ValidatedRow<CreateStaffDto>[],
    _ctx: StaffContext,
    schoolId: string,
  ): Promise<void> {
    const distinct = (pick: (p: CreateStaffDto) => string | undefined) => [
      ...new Set(rows.map((r) => lower(pick(r.payload!))).filter(Boolean)),
    ];
    const fields: { field: StaffUniqueField; column: string; label: string }[] = [
      { field: 'email', column: 'email', label: 'Email' },
      { field: 'employee_code', column: 'employee_code', label: 'Employee code' },
      { field: 'rfid_card_number', column: 'rfid_card_number', label: 'RFID card' },
    ];

    const [phoneOwners, ...fieldOwners] = await Promise.all([
      this.repo.findStaffByPhones(distinct((p) => p.phone_number)),
      ...fields.map((f) =>
        this.repo.findStaffByField(
          schoolId,
          f.field,
          distinct((p) => p[f.field]),
        ),
      ),
    ]);

    const owners = fields.map(
      (_, i) => new Map(fieldOwners[i].map((o) => [lower(o.value), o.name])),
    );

    rows.forEach((row) => {
      const p = row.payload!;
      const sameSchool = phoneOwners.find(
        (o) => o.phone_number === p.phone_number && o.school_id === schoolId,
      );
      if (sameSchool) {
        flag(row, 'phone_number', `Mobile number is already registered to ${sameSchool.name}`);
      } else if (phoneOwners.some((o) => o.phone_number === p.phone_number)) {
        flag(
          row,
          'phone_number',
          'This mobile number is already registered with another school — sign-in may pick the other account',
          'warning',
        );
      }
      fields.forEach((f, i) => {
        const owner = owners[i].get(lower(p[f.field]));
        if (owner) flag(row, f.column, `${f.label} is already used by ${owner}`);
      });
    });
  }

  async persist(
    payload: CreateStaffDto,
    schoolId: string,
    userId: string,
    row: number,
  ): Promise<PersistResult> {
    const password = generateTempPassword();
    const { staff } = await this.staffService.create({ ...payload, password }, schoolId, userId);
    const name = fullName(payload);
    return {
      id: staff.id,
      label: name,
      credentials: [{ row, name, phone_number: staff.phone_number, temporary_password: password }],
    };
  }
}
