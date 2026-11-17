import { Injectable } from '@nestjs/common';
import { StudentsService } from '../../students/students.service';
import { CreateStudentDto, StudentParentDto } from '../../students/dto/create-student.dto';
import {
  BloodGroup,
  Category,
  Gender,
  ParentRelation,
  Religion,
} from '../../../shared/enums/student.enum';
import { BulkImportRepository } from '../bulk-import.repository';
import { BulkImportLookups } from '../bulk-import.lookups';
import {
  BulkImporter,
  ImportColumn,
  PendingRecords,
  PersistResult,
  RowContext,
  RowValues,
  UniqueKey,
  ValidatedRow,
} from '../bulk-import.types';
import {
  YES_NO,
  bloodGroupOptions,
  enumOptions,
  flag,
  lower,
  todayIst,
  yearsBetween,
} from '../bulk-import.utils';

type Year = Awaited<ReturnType<BulkImportRepository['findAcademicYears']>>[number];
type ClassRow = Awaited<ReturnType<BulkImportRepository['findClasses']>>[number];
type SectionRow = Awaited<ReturnType<BulkImportRepository['findSections']>>[number];

interface StudentsContext {
  years: Year[];
  defaultYear?: Year;
  classes: ClassRow[];
  sections: SectionRow[];
  sectionCount: Map<string, number>;
  pendingBySection: Map<string, number>;
  today: string;
}

interface ParentSlot {
  relation: ParentRelation;
  name: string;
  phone: string;
  occupation?: string;
  email?: string;
  label: string;
}

const PARENT_SLOTS: ParentSlot[] = [
  {
    relation: ParentRelation.FATHER,
    name: 'father_name',
    phone: 'father_phone',
    occupation: 'father_occupation',
    email: 'father_email',
    label: 'Father',
  },
  {
    relation: ParentRelation.MOTHER,
    name: 'mother_name',
    phone: 'mother_phone',
    occupation: 'mother_occupation',
    email: 'mother_email',
    label: 'Mother',
  },
  {
    relation: ParentRelation.GUARDIAN,
    name: 'guardian_name',
    phone: 'guardian_phone',
    label: 'Guardian',
  },
];

function splitName(full: string): { first_name: string; last_name?: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first_name: parts[0] };
  return { first_name: parts.slice(0, -1).join(' '), last_name: parts[parts.length - 1] };
}

function str(value: unknown): string | undefined {
  return value === undefined || value === null || value === '' ? undefined : String(value);
}

function primaryPhone(payload: CreateStudentDto): string | undefined {
  return payload.parents?.find((p) => p.is_primary)?.phone_number;
}

function fullName(payload: CreateStudentDto): string {
  return [payload.first_name, payload.last_name].filter(Boolean).join(' ');
}

const CLASS_LABEL_PREFIX = /^(class|std|standard|grade)\b\.?\s*/;

function normalizeClassLabel(value: string): string {
  return lower(value)
    .trim()
    .replace(CLASS_LABEL_PREFIX, '')
    .replace(/[\s\-_]+/g, '');
}

@Injectable()
export class StudentsImporter implements BulkImporter<StudentsContext, CreateStudentDto> {
  readonly entity = 'students' as const;
  readonly label = 'Students';
  readonly dto = CreateStudentDto;

  readonly fieldColumns: Record<string, string> = {
    first_name: 'first_name',
    last_name: 'last_name',
    date_of_birth: 'date_of_birth',
    aadhaar_number: 'aadhaar_number',
    phone_number: 'student_phone',
    email: 'student_email',
    caste: 'caste',
    nationality: 'nationality',
    'academic_info.admission_number': 'admission_number',
    'academic_info.registration_number': 'registration_number',
    'academic_info.roll_number': 'roll_number',
    'academic_info.joining_date': 'joining_date',
  };

  readonly uniqueKeys: UniqueKey<CreateStudentDto>[] = [
    {
      label: 'admission number',
      column: 'admission_number',
      severity: 'error',
      key: (p) => p.academic_info?.admission_number,
    },
    {
      label: 'registration number',
      column: 'registration_number',
      severity: 'error',
      key: (p) => p.academic_info?.registration_number ?? undefined,
    },
    {
      label: 'Aadhaar number',
      column: 'aadhaar_number',
      severity: 'error',
      key: (p) => p.aadhaar_number,
    },
    {
      label: 'roll number in this class/section',
      column: 'roll_number',
      severity: 'error',
      key: (p) => {
        const info = p.academic_info;
        if (!info?.roll_number) return undefined;
        return [info.academic_year_id, info.class_id, info.section_id ?? '', info.roll_number].join(
          '|',
        );
      },
    },
    {
      label: 'student (same name, date of birth and parent phone)',
      column: 'first_name',
      severity: 'error',
      key: (p) => {
        const phone = primaryPhone(p);
        if (!p.date_of_birth || !phone) return undefined;
        return [fullName(p), p.date_of_birth, phone].join('|');
      },
    },
  ];

  constructor(
    private readonly repo: BulkImportRepository,
    private readonly lookups: BulkImportLookups,
    private readonly studentsService: StudentsService,
  ) {}

  async loadContext(schoolId: string): Promise<StudentsContext> {
    const [years, classes, sections, sectionCount] = await Promise.all([
      this.lookups.academicYears(schoolId),
      this.lookups.classes(schoolId),
      this.lookups.sections(schoolId),
      this.lookups.sectionStrength(schoolId),
    ]);
    const open = years.filter((y) => !y.is_frozen && y.is_enabled);
    return {
      years,
      defaultYear:
        open.find((y) => y.is_current) ?? years.find((y) => y.is_current) ?? open[open.length - 1],
      classes,
      sections,
      sectionCount,
      pendingBySection: new Map(),
      today: todayIst(),
    };
  }

  columns(ctx: StudentsContext): ImportColumn[] {
    const openYearIds = new Set(ctx.years.filter((y) => !y.is_frozen).map((y) => y.id));
    const classNames = [
      ...new Set(
        ctx.classes
          .filter((c) => c.is_active && openYearIds.has(c.academic_year_id))
          .map((c) => c.name),
      ),
    ];
    const activeClassIds = new Set(ctx.classes.filter((c) => c.is_active).map((c) => c.id));
    const sectionNames = [
      ...new Set(
        ctx.sections
          .filter((s) => s.is_active && activeClassIds.has(s.class_id))
          .map((s) => s.name),
      ),
    ].sort();
    const defaultYear = ctx.defaultYear?.name ?? 'the current academic year';

    return [
      {
        key: 'first_name',
        header: 'First Name',
        kind: 'text',
        required: true,
        maxLength: 100,
        hint: "Student's first name",
      },
      {
        key: 'last_name',
        header: 'Last Name',
        kind: 'text',
        maxLength: 100,
        hint: "Student's last name / surname",
      },
      {
        key: 'gender',
        header: 'Gender',
        kind: 'enum',
        required: true,
        options: enumOptions(Object.values(Gender), { MALE: ['M', 'Boy'], FEMALE: ['F', 'Girl'] }),
        hint: 'Male, Female or Other',
      },
      { key: 'date_of_birth', header: 'Date of Birth', kind: 'date', hint: 'Must be in the past' },
      {
        key: 'academic_year',
        header: 'Academic Year',
        kind: 'enum',
        options: ctx.years.filter((y) => !y.is_frozen).map((y) => ({ value: y.id, label: y.name })),
        hint: `Leave blank to use ${defaultYear}. Frozen years are not allowed.`,
      },
      {
        key: 'class',
        header: 'Class',
        kind: 'text',
        maxLength: 50,
        required: true,
        options: classNames.map((name) => ({ value: name, label: name })),
        hint: 'Class name or class code as set up in the app, e.g. 1 or Class 1',
        width: 14,
      },
      {
        key: 'section',
        header: 'Section',
        kind: 'text',
        maxLength: 10,
        options: sectionNames.map((name) => ({ value: name, label: name })),
        hint: 'Optional — leave blank to add the student without a section',
        width: 12,
      },
      {
        key: 'admission_number',
        header: 'Admission Number',
        kind: 'text',
        maxLength: 50,
        hint: 'Leave blank to auto-generate from your admission number format. Must be unique.',
      },
      {
        key: 'registration_number',
        header: 'Registration Number',
        kind: 'text',
        maxLength: 30,
        hint: 'Optional. Letters, digits, "/" and "-" only. Must be unique.',
      },
      {
        key: 'roll_number',
        header: 'Roll Number',
        kind: 'digits',
        maxLength: 4,
        hint: 'Leave blank to assign the next roll number in the section. Unique per section.',
      },
      {
        key: 'joining_date',
        header: 'Joining Date',
        kind: 'date',
        hint: 'Date the student joined the school',
      },
      {
        key: 'blood_group',
        header: 'Blood Group',
        kind: 'enum',
        options: bloodGroupOptions(),
        hint: 'e.g. A+, O-, AB+',
      },
      {
        key: 'religion',
        header: 'Religion',
        kind: 'enum',
        options: enumOptions(Object.values(Religion)),
        hint: 'Optional',
      },
      {
        key: 'category',
        header: 'Category',
        kind: 'enum',
        options: enumOptions(Object.values(Category)).map((o) =>
          o.value === 'GENERAL' ? o : { ...o, label: o.value === 'OTHER' ? 'Other' : o.value },
        ),
        hint: 'General, OBC, SC, ST or Other',
      },
      { key: 'caste', header: 'Caste', kind: 'text', maxLength: 50, hint: 'Optional' },
      {
        key: 'nationality',
        header: 'Nationality',
        kind: 'text',
        maxLength: 50,
        hint: 'Defaults to Indian',
      },
      {
        key: 'aadhaar_number',
        header: 'Aadhaar Number',
        kind: 'digits',
        length: 12,
        hint: '12 digits, unique per student',
      },
      {
        key: 'student_phone',
        header: 'Student Phone',
        kind: 'phone',
        hint: 'Optional 10-digit mobile',
      },
      { key: 'student_email', header: 'Student Email', kind: 'email', hint: 'Optional' },
      {
        key: 'father_name',
        header: 'Father Name',
        kind: 'text',
        maxLength: 200,
        hint: 'Full name',
      },
      {
        key: 'father_phone',
        header: 'Father Phone',
        kind: 'phone',
        hint: 'Required when Father Name is given',
      },
      { key: 'father_email', header: 'Father Email', kind: 'email', hint: 'Optional' },
      {
        key: 'father_occupation',
        header: 'Father Occupation',
        kind: 'text',
        maxLength: 100,
        hint: 'Optional',
      },
      {
        key: 'mother_name',
        header: 'Mother Name',
        kind: 'text',
        maxLength: 200,
        hint: 'Full name',
      },
      {
        key: 'mother_phone',
        header: 'Mother Phone',
        kind: 'phone',
        hint: 'Required when Mother Name is given',
      },
      { key: 'mother_email', header: 'Mother Email', kind: 'email', hint: 'Optional' },
      {
        key: 'mother_occupation',
        header: 'Mother Occupation',
        kind: 'text',
        maxLength: 100,
        hint: 'Optional',
      },
      {
        key: 'guardian_name',
        header: 'Guardian Name',
        kind: 'text',
        maxLength: 200,
        hint: 'Use when the student lives with a guardian',
      },
      {
        key: 'guardian_relation',
        header: 'Guardian Relation',
        kind: 'enum',
        options: enumOptions([
          ParentRelation.GUARDIAN,
          ParentRelation.GRANDPARENT,
          ParentRelation.SIBLING,
          ParentRelation.OTHER,
        ]),
        hint: 'Defaults to Guardian',
      },
      {
        key: 'guardian_phone',
        header: 'Guardian Phone',
        kind: 'phone',
        hint: 'Required when Guardian Name is given',
      },
      {
        key: 'parent_login',
        header: 'Enable Parent Login',
        kind: 'boolean',
        options: YES_NO,
        hint: 'Yes creates parent-portal logins. Temporary passwords are shown after the import.',
      },
      {
        key: 'address',
        header: 'Address',
        kind: 'text',
        maxLength: 500,
        hint: 'House, street, area',
        width: 30,
      },
      { key: 'city', header: 'City', kind: 'text', maxLength: 100, hint: 'Optional' },
      { key: 'state', header: 'State', kind: 'text', maxLength: 100, hint: 'Optional' },
      { key: 'pincode', header: 'Pincode', kind: 'digits', length: 6, hint: '6 digits' },
      {
        key: 'previous_school',
        header: 'Previous School',
        kind: 'text',
        maxLength: 300,
        hint: 'Optional',
      },
      {
        key: 'previous_class',
        header: 'Previous Class',
        kind: 'text',
        maxLength: 100,
        hint: 'Optional',
      },
    ];
  }

  examples(ctx: StudentsContext): RowValues[] {
    const yearClasses = ctx.classes.filter(
      (c) => c.is_active && c.academic_year_id === ctx.defaultYear?.id,
    );
    const pick = (index: number) => {
      const cls = yearClasses[index % Math.max(yearClasses.length, 1)];
      const section = ctx.sections.find((s) => s.class_id === cls?.id && s.is_active);
      return { class: cls?.name ?? '1', section: section?.name ?? '' };
    };
    return [
      {
        first_name: 'Aarav',
        last_name: 'Sharma',
        gender: 'Male',
        date_of_birth: '2016-04-12',
        academic_year: ctx.defaultYear?.name ?? '',
        ...pick(0),
        joining_date: ctx.today,
        blood_group: 'B+',
        religion: 'Hindu',
        category: 'General',
        nationality: 'Indian',
        aadhaar_number: '234567890123',
        father_name: 'Rakesh Sharma',
        father_phone: '9876543210',
        father_occupation: 'Engineer',
        mother_name: 'Sunita Sharma',
        mother_phone: '9876543211',
        parent_login: 'Yes',
        address: '12, MG Road',
        city: 'Jaipur',
        state: 'Rajasthan',
        pincode: '302001',
      },
      {
        first_name: 'Ananya',
        last_name: 'Verma',
        gender: 'Female',
        date_of_birth: '15-08-2015',
        ...pick(1),
        roll_number: '12',
        blood_group: 'O+',
        category: 'OBC',
        mother_name: 'Priya Verma',
        mother_phone: '9123456780',
        parent_login: 'No',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        previous_school: 'Little Flower School',
        previous_class: 'Class 2',
      },
      {
        first_name: 'Kabir',
        gender: 'Male',
        ...pick(2),
        admission_number: 'ADM-2025-0099',
        guardian_name: 'Mohan Lal',
        guardian_relation: 'Grandparent',
        guardian_phone: '9988776655',
      },
    ];
  }

  notes(ctx: StudentsContext): string[] {
    return [
      `Students are added to ${ctx.defaultYear?.name ?? 'the current academic year'} unless you pick another year.`,
      'Give at least one parent or guardian with a phone number so the school can reach the family.',
      'Rows that match an existing student (same name, date of birth and parent phone) are rejected to avoid duplicates.',
    ];
  }

  toPayload(row: RowContext, ctx: StudentsContext): CreateStudentDto | undefined {
    const v = row.values;
    const year = v.academic_year
      ? ctx.years.find((y) => y.id === v.academic_year)
      : ctx.defaultYear;

    if (!year) {
      row.issue(
        'academic_year',
        'No academic year is set up — create one before importing students',
      );
    } else if (year.is_frozen) {
      row.issue('academic_year', `Academic year '${year.name}' is frozen`);
    } else if (!year.is_enabled) {
      row.issue('academic_year', `Academic year '${year.name}' is disabled`);
    }

    let classId: string | undefined;
    let sectionId: string | undefined;
    if (year && v.class) {
      const yearClasses = ctx.classes.filter((c) => c.academic_year_id === year.id);
      const matches = this.matchClass(yearClasses, String(v.class));
      if (!matches.length) {
        const available = yearClasses.filter((c) => c.is_active).map((c) => c.name);
        row.issue(
          'class',
          available.length
            ? `Class '${v.class}' does not exist in ${year.name} (available: ${available.join(', ')})`
            : `No classes are set up in ${year.name} yet — create classes before importing students`,
        );
      } else if (matches.length > 1) {
        row.issue('class', `More than one class is named '${v.class}' in ${year.name}`);
      } else if (!matches[0].is_active) {
        row.issue('class', `Class '${v.class}' is inactive`);
      } else {
        classId = matches[0].id;
        sectionId = this.resolveSection(row, ctx, matches[0]);
      }
    }

    if (v.date_of_birth) {
      const dob = String(v.date_of_birth);
      if (dob > ctx.today) {
        row.issue('date_of_birth', 'Date of birth cannot be in the future');
      } else {
        const age = yearsBetween(dob, ctx.today);
        if (age < 2 || age > 25) {
          row.issue(
            'date_of_birth',
            `Student would be ${age} years old — please double-check`,
            'warning',
          );
        }
      }
      if (v.joining_date && String(v.joining_date) < dob) {
        row.issue('joining_date', 'Joining date cannot be before the date of birth');
      }
    }

    const parents = this.buildParents(row);
    if (!parents.length) {
      row.issue('father_name', 'No parent or guardian with a phone number was given', 'warning');
    }

    const address = {
      address: str(v.address),
      city: str(v.city),
      state: str(v.state),
      pincode: str(v.pincode),
    };
    const previous = {
      previous_school_name: str(v.previous_school),
      previous_class: str(v.previous_class),
    };

    if (!year || !classId) return undefined;
    return {
      first_name: String(v.first_name ?? ''),
      last_name: str(v.last_name),
      gender: v.gender as Gender,
      date_of_birth: str(v.date_of_birth),
      blood_group: v.blood_group as BloodGroup | undefined,
      religion: v.religion as Religion | undefined,
      category: v.category as Category | undefined,
      caste: str(v.caste),
      nationality: str(v.nationality),
      aadhaar_number: str(v.aadhaar_number),
      dial_code: v.student_phone ? '+91' : undefined,
      phone_number: str(v.student_phone),
      email: str(v.student_email),
      academic_info: {
        academic_year_id: year.id,
        class_id: classId,
        section_id: sectionId,
        admission_number: str(v.admission_number),
        registration_number: str(v.registration_number),
        roll_number: str(v.roll_number),
        joining_date: str(v.joining_date),
      },
      address: Object.values(address).some(Boolean) ? address : undefined,
      previous_academics: Object.values(previous).some(Boolean) ? previous : undefined,
      parents: parents.length ? parents : undefined,
    } as CreateStudentDto;
  }

  private matchClass(yearClasses: ClassRow[], wanted: string): ClassRow[] {
    const key = normalizeClassLabel(wanted);
    const byName = yearClasses.filter((c) => normalizeClassLabel(c.name) === key);
    if (byName.length) return byName;
    return yearClasses.filter((c) => c.class_code && normalizeClassLabel(c.class_code) === key);
  }

  private resolveSection(row: RowContext, ctx: StudentsContext, cls: ClassRow): string | undefined {
    const classSections = ctx.sections.filter((s) => s.class_id === cls.id && s.is_active);
    const wanted = row.values.section ? String(row.values.section) : undefined;
    const available = classSections.map((s) => s.name).join(', ');

    if (!wanted) {
      if (classSections.length) {
        row.issue(
          'section',
          `No section given — the student will be added to class ${cls.name} without a section (available: ${available})`,
          'warning',
        );
      }
      return undefined;
    }
    const section = classSections.find((s) => lower(s.name) === lower(wanted));
    if (!section) {
      row.issue(
        'section',
        classSections.length
          ? `Section '${wanted}' does not exist in class ${cls.name} (available: ${available})`
          : `Class ${cls.name} has no sections — leave Section blank`,
      );
      return undefined;
    }

    const pending = (ctx.pendingBySection.get(section.id) ?? 0) + 1;
    ctx.pendingBySection.set(section.id, pending);
    const strength = (ctx.sectionCount.get(section.id) ?? 0) + pending;
    if (section.max_strength && strength > section.max_strength) {
      row.issue(
        'section',
        `Section ${cls.name}-${section.name} would have ${strength} students (capacity ${section.max_strength})`,
        'warning',
      );
    }
    return section.id;
  }

  private buildParents(row: RowContext): StudentParentDto[] {
    const v = row.values;
    const enableLogin = v.parent_login === true;
    const parents: StudentParentDto[] = [];

    PARENT_SLOTS.forEach((slot) => {
      const name = str(v[slot.name]);
      const phone = str(v[slot.phone]);
      if (!name && !phone) return;
      if (!name) {
        row.issue(slot.name, `${slot.label} Name is required when ${slot.label} Phone is given`);
        return;
      }
      if (!phone) {
        row.issue(slot.phone, `${slot.label} Phone is required when ${slot.label} Name is given`);
        return;
      }
      const relation =
        slot.relation === ParentRelation.GUARDIAN && v.guardian_relation
          ? (v.guardian_relation as ParentRelation)
          : slot.relation;
      parents.push({
        relation,
        ...splitName(name),
        dial_code: '+91',
        phone_number: phone,
        email: slot.email ? str(v[slot.email]) : undefined,
        occupation: slot.occupation ? str(v[slot.occupation]) : undefined,
        is_primary: parents.length === 0,
        can_pickup: true,
        enable_login: enableLogin,
      } as StudentParentDto);
    });

    if (enableLogin && !parents.length) {
      row.issue('parent_login', 'Parent login needs at least one parent or guardian with a phone');
    }
    return parents;
  }

  async checkExisting(
    rows: ValidatedRow<CreateStudentDto>[],
    _ctx: StudentsContext,
    schoolId: string,
  ): Promise<void> {
    const values = (pick: (p: CreateStudentDto) => string | null | undefined) => [
      ...new Set(rows.map((r) => pick(r.payload!)).filter((x): x is string => !!x)),
    ];

    const [admissions, registrations, aadhaars, rolls, identities] = await Promise.all([
      this.repo.findStudentsByAcademicNumber(
        schoolId,
        'admission_number',
        values((p) => p.academic_info?.admission_number),
      ),
      this.repo.findStudentsByAcademicNumber(
        schoolId,
        'registration_number',
        values((p) => p.academic_info?.registration_number),
      ),
      this.repo.findStudentsByAadhaar(
        schoolId,
        values((p) => p.aadhaar_number),
      ),
      this.repo.findRollNumbers(
        schoolId,
        values((p) => (p.academic_info?.roll_number ? p.academic_info.class_id : undefined)),
      ),
      this.repo.findStudentIdentities(
        schoolId,
        values((p) => lower(p.first_name)),
      ),
    ]);

    const byValue = (list: { value: string | null; name: string }[]) =>
      new Map(list.map((x) => [lower(x.value), x.name]));
    const admissionOwners = byValue(admissions);
    const registrationOwners = byValue(registrations);
    const aadhaarOwners = byValue(aadhaars);
    const takenRolls = new Set(
      rolls.map((r) =>
        [r.academic_year_id, r.class_id, r.section_id ?? '', r.roll_number].join('|'),
      ),
    );

    const known = new Map<string, { dob: string | null; phones: Set<string>; admission: string }>();
    identities.forEach((s) => {
      const key = lower([s.first_name, s.last_name].filter(Boolean).join(' '));
      const id = `${key}|${s.date_of_birth ?? ''}|${s.admission_number ?? ''}`;
      const entry = known.get(id) ?? {
        dob: s.date_of_birth,
        phones: new Set<string>(),
        admission: s.admission_number ?? '—',
      };
      if (s.parent_phone) entry.phones.add(s.parent_phone);
      known.set(id, entry);
    });

    rows.forEach((row) => {
      const p = row.payload!;
      const info = p.academic_info!;
      const admissionOwner =
        info.admission_number && admissionOwners.get(lower(info.admission_number));
      if (admissionOwner) {
        flag(row, 'admission_number', `Admission number already belongs to ${admissionOwner}`);
      }
      const registrationOwner =
        info.registration_number && registrationOwners.get(lower(info.registration_number));
      if (registrationOwner) {
        flag(
          row,
          'registration_number',
          `Registration number already belongs to ${registrationOwner}`,
        );
      }
      const aadhaarOwner = p.aadhaar_number && aadhaarOwners.get(lower(p.aadhaar_number));
      if (aadhaarOwner)
        flag(row, 'aadhaar_number', `Aadhaar number already belongs to ${aadhaarOwner}`);

      if (
        info.roll_number &&
        takenRolls.has(
          [info.academic_year_id, info.class_id, info.section_id ?? '', info.roll_number].join('|'),
        )
      ) {
        flag(
          row,
          'roll_number',
          `Roll number ${info.roll_number} is already taken in this class/section`,
        );
      }

      if (!p.date_of_birth) return;
      const name = lower(fullName(p));
      const phone = primaryPhone(p);
      for (const [id, existing] of known) {
        if (!id.startsWith(`${name}|`) || existing.dob !== p.date_of_birth) continue;
        if (phone && existing.phones.has(phone)) {
          flag(row, 'first_name', `This student already exists (Adm. No. ${existing.admission})`);
        } else {
          flag(
            row,
            'first_name',
            `A student with the same name and date of birth exists (Adm. No. ${existing.admission})`,
            'warning',
          );
        }
        break;
      }
    });
  }

  persistOrder(rows: ValidatedRow<CreateStudentDto>[]): ValidatedRow<CreateStudentDto>[] {
    const explicit = rows.filter((r) => r.payload?.academic_info?.roll_number);
    const automatic = rows.filter((r) => !r.payload?.academic_info?.roll_number);
    return [...explicit, ...automatic];
  }

  collectPending(rows: ValidatedRow<CreateStudentDto>[], pending: PendingRecords): void {
    rows.forEach(({ payload }) => {
      const admission = payload!.academic_info?.admission_number;
      if (admission)
        pending.students.push({ admission_number: admission, name: fullName(payload!) });
    });
  }

  async persist(
    payload: CreateStudentDto,
    schoolId: string,
    userId: string,
    row: number,
  ): Promise<PersistResult> {
    const created = await this.studentsService.create(payload, schoolId, userId);
    const name = fullName(payload);
    return {
      id: created.student.id,
      label: `${name} · Adm. No. ${created.academicInfo?.admission_number ?? '—'}`,
      credentials: created.parent_credentials.map((c) => ({
        row,
        name: `${c.name} (parent of ${name})`,
        phone_number: c.phone_number,
        temporary_password: c.temporary_password,
      })),
    };
  }
}
