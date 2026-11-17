import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, ConflictException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { BulkImportService } from './bulk-import.service';
import { BulkImportLookups } from './bulk-import.lookups';
import { BulkImportRepository } from './bulk-import.repository';
import { RedisService } from '../redis/redis.service';
import { FinanceService } from '../finance/finance.service';
import { StudentsService } from '../students/students.service';
import { StaffService } from '../staff/staff.service';
import { FinanceHeadsImporter } from './importers/finance-heads.importer';
import { FinanceAccountsImporter } from './importers/finance-accounts.importer';
import { FinanceIncomeImporter } from './importers/finance-income.importer';
import { FinanceExpensesImporter } from './importers/finance-expenses.importer';
import { StudentsImporter } from './importers/students.importer';
import { StaffImporter } from './importers/staff.importer';
import { ImportJob, WorkbookJob } from './bulk-import.types';
import { BulkImportWorkbookService } from './bulk-import-workbook.service';
import { PermissionsService } from '../permissions/permissions.service';
import { JwtPayload } from '../../shared/types/jwt-payload.types';

const SCHOOL = 'school-1';
const USER = 'user-1';

type Cell = string | number | Date | undefined;

async function xlsx(headers: string[], rows: Cell[][], sheetName = 'Data') {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.addRow(headers);
  rows.forEach((r) => sheet.addRow(r));
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return { buffer, originalname: 'upload.xlsx', size: buffer.length };
}

async function workbookFile(sheets: Record<string, Cell[][]>) {
  const workbook = new ExcelJS.Workbook();
  Object.entries(sheets).forEach(([name, rows]) => {
    const sheet = workbook.addWorksheet(name);
    rows.forEach((r) => sheet.addRow(r));
  });
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return { buffer, originalname: 'school.xlsx', size: buffer.length };
}

async function readBack(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  return workbook;
}

function fakeRedis() {
  const store = new Map<string, string>();
  const redis = {
    store,
    getOrSet: jest.fn(async (key: string, _ttl: number, factory: () => Promise<unknown>) => {
      if (store.has(key)) return JSON.parse(store.get(key)!);
      const data = await factory();
      store.set(key, JSON.stringify(data));
      return data;
    }),
    setex: jest.fn(async (key: string, _ttl: number, value: string) => {
      store.set(key, value);
      return 'OK';
    }),
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    setnx: jest.fn(async (key: string, value: string) => {
      if (store.has(key)) return 0;
      store.set(key, value);
      return 1;
    }),
    expire: jest.fn(async () => 1),
    del: jest.fn(async (key: string) => (store.delete(key) ? 1 : 0)),
  };
  return redis;
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

async function waitForJob(service: BulkImportService, entity: 'finance-heads', jobId: string) {
  for (let i = 0; i < 50; i++) {
    await flush();
    const job = await service.getJob(entity, SCHOOL, jobId);
    if (job.status !== 'running') return job;
  }
  throw new Error('job did not finish');
}

describe('BulkImportService', () => {
  let redis: ReturnType<typeof fakeRedis>;
  let repo: Record<string, jest.Mock>;
  let finance: Record<string, jest.Mock>;
  let students: Record<string, jest.Mock>;
  let staff: Record<string, jest.Mock>;
  let service: BulkImportService;
  let workbook: BulkImportWorkbookService;
  let granted: 'all' | string[];
  const user = { sub: USER, role: 'SCHOOL_ADMIN', context: 'school' } as unknown as JwtPayload;

  beforeEach(() => {
    redis = fakeRedis();
    const none = () => jest.fn(async () => [] as unknown[]);
    repo = {
      findAcademicYears: jest.fn(async () => [
        {
          id: 'y1',
          name: '2025-26',
          is_current: true,
          is_frozen: false,
          is_enabled: true,
          start_date: '2025-04-01',
        },
        {
          id: 'y0',
          name: '2024-25',
          is_current: false,
          is_frozen: true,
          is_enabled: true,
          start_date: '2024-04-01',
        },
      ]),
      findClasses: jest.fn(async () => [
        { id: 'c1', name: '5', academic_year_id: 'y1', is_active: true },
        { id: 'c2', name: 'Nursery', academic_year_id: 'y1', is_active: true },
        { id: 'c0', name: '5', academic_year_id: 'y0', is_active: true },
      ]),
      findSections: jest.fn(async () => [
        { id: 's1', name: 'A', class_id: 'c1', max_strength: 2, is_active: true },
        { id: 's2', name: 'B', class_id: 'c1', max_strength: 40, is_active: true },
      ]),
      countBySection: jest.fn(async () => [{ section_id: 's1', total: 1 }]),
      findStudentsByAcademicNumber: jest.fn(async (_s: string, field: string, values: string[]) =>
        field === 'admission_number' && values.includes('ADM-1')
          ? [{ value: 'ADM-1', student_id: 'st-1', name: 'Old Student' }]
          : [],
      ),
      findRollNumbers: jest.fn(async () => [
        { academic_year_id: 'y1', class_id: 'c1', section_id: 's2', roll_number: '7' },
      ]),
      findStudentsByAadhaar: none(),
      findStudentIdentities: jest.fn(async () => [
        {
          first_name: 'Riya',
          last_name: 'Sen',
          date_of_birth: '2015-01-10',
          parent_phone: '9876500000',
          admission_number: 'ADM-9',
        },
      ]),
      findRoles: jest.fn(async () => [
        {
          id: '00000000-0000-4000-8000-000000000001',
          name: 'School Admin',
          slug: 'school_admin',
          is_system: true,
        },
        {
          id: '00000000-0000-4000-8000-000000000002',
          name: 'Teacher',
          slug: 'teacher',
          is_system: true,
        },
        {
          id: '00000000-0000-4000-8000-000000000003',
          name: 'Driver',
          slug: 'driver',
          is_system: false,
        },
      ]),
      findStaffByPhones: jest.fn(async () => [
        {
          id: 'u1',
          school_id: SCHOOL,
          phone_number: '9000000001',
          employee_code: 'E1',
          name: 'Existing Staff',
        },
        {
          id: 'u2',
          school_id: 'other',
          phone_number: '9000000002',
          employee_code: null,
          name: 'Elsewhere',
        },
      ]),
      findStaffByField: jest.fn(async (_s: string, field: string, values: string[]) =>
        field === 'employee_code' && values.includes('emp-7')
          ? [{ id: 'u7', value: 'EMP-7', name: 'Mohan' }]
          : [],
      ),
      findFinanceAccounts: jest.fn(async () => [
        {
          id: 'a1',
          name: 'SBI',
          is_enabled: true,
          current_balance: '1000.00',
          account_start_date: '2024-01-01',
        },
        {
          id: 'a2',
          name: 'Old Cash',
          is_enabled: false,
          current_balance: '0',
          account_start_date: '2024-01-01',
        },
      ]),
      findFinanceHeads: jest.fn(async () => [
        { id: 'h1', name: 'Admission Fee', head_type: 'Income', is_enabled: true },
        { id: 'h2', name: 'Electricity', head_type: 'Expense', is_enabled: true },
      ]),
      findIncomeOnDates: none(),
      findExpensesOnDates: jest.fn(async () => [
        { head_id: 'h2', account_id: 'a1', amount: '100.00', date: '2025-05-01', party_id: null },
      ]),
    };
    finance = {
      createHead: jest.fn(async (dto: { name: string; head_type: string }) => {
        if (dto.name === 'Race') throw new ConflictException('Head was created meanwhile');
        return { id: `id-${dto.name}`, ...dto };
      }),
      createAccount: jest.fn(),
      createIncome: jest.fn(),
      createExpense: jest.fn(),
    };
    students = { create: jest.fn() };
    staff = { create: jest.fn() };

    const r = repo as unknown as BulkImportRepository;
    const lookups = new BulkImportLookups(r, redis as unknown as RedisService);
    const fs = finance as unknown as FinanceService;
    service = new BulkImportService(
      redis as unknown as RedisService,
      new StudentsImporter(r, lookups, students as unknown as StudentsService),
      new StaffImporter(r, lookups, staff as unknown as StaffService),
      new FinanceAccountsImporter(lookups, fs),
      new FinanceHeadsImporter(lookups, fs),
      new FinanceIncomeImporter(r, lookups, fs),
      new FinanceExpensesImporter(r, lookups, fs),
    );
    granted = 'all';
    const permissions = { grantedPermissions: jest.fn(async () => granted) };
    workbook = new BulkImportWorkbookService(service, permissions as unknown as PermissionsService);
  });

  describe('template', () => {
    it('builds instructions, data, example and hidden list sheets from live school data', async () => {
      const { buffer, fileName } = await service.template('students', SCHOOL);
      expect(fileName).toBe('students-import-template.xlsx');
      const workbook = await readBack(buffer);
      expect(workbook.worksheets.map((w) => w.name)).toEqual([
        'Instructions',
        'Data',
        'Example',
        'Lists',
      ]);
      expect(workbook.getWorksheet('Lists')!.state).toBe('veryHidden');
      const header = workbook.getWorksheet('Data')!.getRow(1).values as string[];
      expect(header).toContain('First Name *');
      expect(header).toContain('Class *');
      const lists = workbook.getWorksheet('Lists')!;
      const listValues = lists.getSheetValues().flat().filter(Boolean);
      expect(listValues).toEqual(expect.arrayContaining(['2025-26', 'Nursery', 'A', 'B', 'A+']));
      expect(listValues).not.toContain('2024-25');
    });

    it('serves reference data from Redis on repeat downloads', async () => {
      await service.template('finance-heads', SCHOOL);
      await service.template('finance-heads', SCHOOL);
      expect(repo.findFinanceHeads).toHaveBeenCalledTimes(1);
      expect(redis.store.has(`finance:heads:${SCHOOL}:bulk-import`)).toBe(true);
    });

    it('never offers School Admin as an importable staff role', async () => {
      const workbook = await readBack((await service.template('staff', SCHOOL)).buffer);
      const listValues = workbook.getWorksheet('Lists')!.getSheetValues().flat();
      expect(listValues).toContain('Teacher');
      expect(listValues).not.toContain('School Admin');
    });
  });

  describe('validate', () => {
    it('flags in-file duplicates, existing records and invalid values per row', async () => {
      const file = await xlsx(
        ['Head Name *', 'Head Type *', 'Enabled', 'Something Else'],
        [
          ['Transport Fee', 'income', 'Yes', 'x'],
          ['transport fee', 'Income', '', ''],
          ['Admission Fee', 'Income', '', ''],
          ['Admission Fee', 'Expense', 'no', ''],
          ['Canteen', 'Loan', '', ''],
          [undefined, undefined, undefined, undefined],
          ['', 'Expense', 'maybe', ''],
        ],
      );
      const report = await service.validate('finance-heads', file, SCHOOL);

      expect(report.header_issues).toEqual([
        "Column 'Something Else' is not recognised and was ignored",
      ]);
      expect(report.summary).toEqual({ total: 6, ready: 2, warning: 0, error: 4 });
      const byRow = new Map(report.rows.map((r) => [r.row, r]));
      expect(byRow.get(2)!.status).toBe('ready');
      expect(byRow.get(3)!.issues[0].message).toMatch(/same as row 2/);
      expect(byRow.get(4)!.issues[0].message).toMatch(/already exists/);
      expect(byRow.get(5)!.status).toBe('ready');
      expect(byRow.get(6)!.issues[0]).toMatchObject({ column: 'head_type', severity: 'error' });
      expect(byRow.get(8)!.issues.map((i) => i.column)).toEqual(['name', 'is_enabled']);
    });

    it('rejects unsupported files, missing headers and empty sheets with a clear reason', async () => {
      await expect(
        service.validate(
          'finance-heads',
          { buffer: Buffer.from('x'), originalname: 'a.pdf', size: 1 },
          SCHOOL,
        ),
      ).rejects.toThrow(/not supported/);
      await expect(
        service.validate(
          'finance-heads',
          { buffer: Buffer.from('junk'), originalname: 'a.xlsx', size: 4 },
          SCHOOL,
        ),
      ).rejects.toThrow(/could not be read/);
      await expect(
        service.validate('finance-heads', await xlsx(['Foo'], [['bar']]), SCHOOL),
      ).rejects.toThrow(/header row/);
      await expect(
        service.validate('finance-heads', await xlsx(['Head Name', 'Head Type'], []), SCHOOL),
      ).rejects.toThrow(/no data rows/);
      await expect(service.validate('finance-heads', undefined, SCHOOL)).rejects.toThrow(/Attach/);
    });

    it('reads CSV uploads as raw text', async () => {
      const csv = Buffer.from('Head Name,Head Type\nBus Fee,Income\n');
      const report = await service.validate(
        'finance-heads',
        { buffer: csv, originalname: 'heads.csv', size: csv.length },
        SCHOOL,
      );
      expect(report.summary.ready).toBe(1);
    });

    it('applies student class, section, year, duplicate and parent rules', async () => {
      const headers = [
        'First Name',
        'Last Name',
        'Gender',
        'Date of Birth',
        'Academic Year',
        'Class',
        'Section',
        'Admission Number',
        'Roll Number',
        'Father Name',
        'Father Phone',
        'Mother Name',
        'Mother Phone',
        'Enable Parent Login',
      ];
      const file = await xlsx(headers, [
        [
          'Asha',
          'Rao',
          'F',
          new Date(Date.UTC(2015, 2, 1)),
          '',
          '5',
          'a',
          '',
          '',
          'Ravi Rao',
          '9876543210',
          '',
          '',
          'Yes',
        ],
        ['Dev', '', 'Male', '', '', '5', '', '', '', '', '', '', '', ''],
        ['Kiran', '', 'Male', '', '2024-25', '5', 'A', '', '', '', '', '', '', ''],
        ['Meera', '', 'Female', '', '', '5', 'C', '', '', '', '', '', '', ''],
        ['Old', '', 'Male', '', '', '5', 'B', 'ADM-1', '7', '', '', '', '', ''],
        [
          'Riya',
          'Sen',
          'Female',
          '10-01-2015',
          '',
          '5',
          'B',
          '',
          '',
          'Amit Sen',
          '9876500000',
          '',
          '',
          '',
        ],
        ['Tara', '', 'Female', '', '', 'Nursery', '', '', '', 'Raj', '', '', '9123456789', 'Yes'],
        ['Zoe', '', 'Female', '', '', '5', 'A', '', '', '', '', '', '', ''],
        ['Neel', '', 'Male', '', '', 'Class 5', 'B', '', '', '', '', '', '', ''],
        ['Ira', '', 'Female', '', '', '9', '', '', '', '', '', '', '', ''],
      ]);
      const report = await service.validate('students', file, SCHOOL);
      const issues = (row: number) => report.rows.find((r) => r.row === row)!.issues;
      const messages = (row: number) =>
        issues(row)
          .map((i) => i.message)
          .join(' | ');

      expect(report.rows.find((r) => r.row === 2)!.status).toBe('ready');
      expect(issues(3)).toContainEqual(
        expect.objectContaining({
          column: 'section',
          severity: 'warning',
          message: expect.stringMatching(
            /No section given .* class 5 without a section \(available: A, B\)/,
          ),
        }),
      );
      expect(issues(3).some((i) => i.severity === 'error')).toBe(false);
      expect(messages(4)).toMatch(/'2024-25' is not a valid Academic Year/);
      expect(messages(5)).toMatch(/Section 'C' does not exist in class 5 \(available: A, B\)/);
      expect(messages(6)).toMatch(/Admission number already belongs to Old Student/);
      expect(messages(6)).toMatch(/Roll number 7 is already taken/);
      expect(messages(7)).toMatch(/already exists \(Adm. No. ADM-9\)/);
      expect(messages(8)).toMatch(/Father Phone is required when Father Name is given/);
      expect(messages(8)).toMatch(/Mother Name is required when Mother Phone is given/);
      expect(issues(9)).toEqual([
        expect.objectContaining({
          column: 'section',
          severity: 'warning',
          message: expect.stringMatching(/capacity 2/),
        }),
        expect.objectContaining({
          severity: 'warning',
          message: expect.stringMatching(/No parent/),
        }),
      ]);
      expect(issues(10).some((i) => i.column === 'class')).toBe(false);
      expect(messages(11)).toMatch(/Class '9' does not exist in 2025-26 \(available: 5, Nursery\)/);
    });

    it('resolves expense parties and warns on duplicates and negative balances', async () => {
      const file = await xlsx(
        [
          'Date',
          'Expense Head',
          'Paid From Account',
          'Amount',
          'Employee Code or Mobile',
          'Remarks',
        ],
        [
          ['2025-05-01', 'Electricity', 'SBI', 100, '', 'May bill'],
          ['2025-05-02', 'Electricity', 'SBI', '₹ 950', 'emp-7', ''],
          ['2025-05-02', 'Electricity', 'Old Cash', 10, '', ''],
          ['2099-01-01', 'Electricity', 'SBI', 0, 'nobody', ''],
          ['2023-12-31', 'Electricity', 'SBI', 5, '', ''],
        ],
      );
      const report = await service.validate('finance-expenses', file, SCHOOL);
      const messages = (row: number) =>
        report.rows
          .find((r) => r.row === row)!
          .issues.map((i) => i.message)
          .join(' | ');

      expect(messages(2)).toMatch(/identical entry already exists/);
      expect(messages(3)).toMatch(/balance will go negative \(₹-50.00\)/);
      expect(messages(4)).toMatch(/'Old Cash' is not a valid Paid From Account/);
      expect(messages(5)).toMatch(/future/);
      expect(messages(5)).toMatch(/greater than 0/);
      expect(messages(6)).toMatch(/starts on 2024-01-01/);
    });

    it('rejects duplicate staff phones in the school and warns for other schools', async () => {
      const file = await xlsx(
        ['First Name', 'Mobile Number', 'Role', 'Employee Code'],
        [
          ['A', '9000000001', 'Teacher', ''],
          ['B', '9000000002', 'Driver', ''],
          ['C', '9000000003', 'School Admin', 'EMP-7'],
          ['D', '+91 90000 00002', 'teacher', ''],
        ],
      );
      const report = await service.validate('staff', file, SCHOOL);
      const row = (n: number) => report.rows.find((r) => r.row === n)!;
      expect(row(2).issues[0].message).toMatch(/already registered to Existing Staff/);
      expect(row(3)).toMatchObject({ status: 'warning' });
      expect(row(4).issues.map((i) => i.column)).toEqual(['role']);
      expect(
        row(5)
          .issues.map((i) => i.message)
          .join(),
      ).toMatch(/same as row 3/);
    });
  });

  describe('report', () => {
    it('exports only error rows, annotated, and the file can be re-uploaded as is', async () => {
      const file = await xlsx(
        ['Head Name', 'Head Type'],
        [
          ['Bus Fee', 'Income'],
          ['Canteen', 'Loan'],
        ],
      );
      const { buffer } = await service.report('finance-heads', file, SCHOOL, true);
      const sheet = (await readBack(buffer)).getWorksheet('Data')!;
      expect(sheet.getRow(1).values).toEqual(
        expect.arrayContaining(['Head Name *', 'Head Type *', 'Import Status', 'Import Issues']),
      );
      expect(sheet.rowCount).toBe(2);
      expect(sheet.getRow(2).getCell(2).note).toBeDefined();
      expect(String(sheet.getRow(2).getCell(5).value)).toMatch(/Head Type: 'Loan'/);

      const again = await service.validate(
        'finance-heads',
        { buffer, originalname: 'errors.xlsx', size: buffer.length },
        SCHOOL,
      );
      expect(again.header_issues).toEqual([]);
      expect(again.summary).toMatchObject({ total: 1, error: 1 });
    });
  });

  describe('import', () => {
    const headsFile = () =>
      xlsx(
        ['Head Name', 'Head Type'],
        [
          ['Bus Fee', 'Income'],
          ['Race', 'Expense'],
          ['Canteen', 'Loan'],
        ],
      );

    it('refuses to import rows with errors unless asked to skip them', async () => {
      await expect(
        service.startImport('finance-heads', await headsFile(), SCHOOL, USER, false),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(finance.createHead).not.toHaveBeenCalled();
    });

    it('imports valid rows in the background, reporting per-row outcomes and releasing the lock', async () => {
      const job = await service.startImport('finance-heads', await headsFile(), SCHOOL, USER, true);
      expect(job).toMatchObject({ status: 'running', total: 2, skipped: 1 });

      const done: ImportJob = await waitForJob(service, 'finance-heads', job.job_id);
      expect(done).toMatchObject({ status: 'completed', created: 1, failed: 1, processed: 2 });
      expect(done.results).toEqual([
        { row: 2, status: 'created', label: 'Bus Fee (Income)' },
        { row: 3, status: 'failed', label: 'Row 3', message: 'Head was created meanwhile' },
      ]);
      expect(finance.createHead).toHaveBeenCalledWith(
        { name: 'Bus Fee', head_type: 'Income', is_enabled: true },
        SCHOOL,
        USER,
      );
      expect(redis.store.has(`bulk_import:lock:${SCHOOL}:finance-heads`)).toBe(false);
    });

    it('blocks a second concurrent import of the same type for the school', async () => {
      let release: () => void = () => undefined;
      finance.createHead.mockImplementation(
        () =>
          new Promise(
            (resolve) => (release = () => resolve({ id: 'x', name: 'x', head_type: 'Income' })),
          ),
      );
      const [first, second] = [await headsFile(), await headsFile()];
      const job = await service.startImport('finance-heads', first, SCHOOL, USER, true);
      await expect(
        service.startImport('finance-heads', second, SCHOOL, USER, true),
      ).rejects.toBeInstanceOf(ConflictException);
      release();
      await flush();
      release();
      await waitForJob(service, 'finance-heads', job.job_id);
      await expect(
        service.startImport('finance-heads', await headsFile(), SCHOOL, USER, true),
      ).resolves.toMatchObject({ status: 'running' });
    });

    it('scopes job lookups to the school and entity', async () => {
      const job = await service.startImport('finance-heads', await headsFile(), SCHOOL, USER, true);
      await expect(service.getJob('finance-heads', 'other-school', job.job_id)).rejects.toThrow(
        /not found/,
      );
      await expect(service.getJob('staff', SCHOOL, job.job_id)).rejects.toThrow(/not found/);
    });
  });

  describe('workbook', () => {
    async function waitForWorkbook(jobId: string): Promise<WorkbookJob> {
      for (let i = 0; i < 100; i++) {
        await flush();
        const job = await workbook.getJob(SCHOOL, jobId);
        if (job.status !== 'running') return job;
      }
      throw new Error('workbook job did not finish');
    }

    it('builds one sheet per type the caller may import, in import order', async () => {
      const all = await readBack((await workbook.template(user, SCHOOL)).buffer);
      expect(all.worksheets.map((w) => w.name)).toEqual([
        'Instructions',
        'Finance Accounts',
        'Finance Heads',
        'Staff',
        'Students',
        'Income',
        'Expenses',
        'Example',
        'Lists',
      ]);

      granted = ['finance.create'];
      const financeOnly = await readBack((await workbook.template(user, SCHOOL)).buffer);
      expect(financeOnly.worksheets.map((w) => w.name)).toEqual([
        'Instructions',
        'Finance Accounts',
        'Finance Heads',
        'Income',
        'Expenses',
        'Example',
        'Lists',
      ]);
    });

    it('lets later sheets use records added by earlier sheets and enforces per-sheet permissions', async () => {
      granted = ['finance.create'];
      const file = await workbookFile({
        Income: [
          ['Date', 'Income Head', 'Credit To Account', 'Amount'],
          ['2025-05-01', 'Bus Fee', 'HDFC', 500],
          ['2025-05-01', 'Bus Fee', 'Nowhere', 500],
        ],
        Accounts: [
          ['Account Name', 'Account Type', 'Opening Balance', 'Account Start Date'],
          ['HDFC', 'Bank', 1000, '2025-01-01'],
        ],
        Heads: [
          ['Head Name', 'Head Type'],
          ['Bus Fee', 'Income'],
        ],
        Students: [
          ['First Name', 'Gender', 'Class'],
          ['Asha', 'F', '5'],
        ],
        Expenses: [],
        Notes: [['anything']],
      });

      const report = await workbook.validate(user, file, SCHOOL);
      expect(report.sheets.map((s) => [s.sheet_name, s.entity])).toEqual([
        ['Accounts', 'finance-accounts'],
        ['Heads', 'finance-heads'],
        ['Students', 'students'],
        ['Income', 'finance-income'],
        ['Expenses', 'finance-expenses'],
      ]);
      expect(report.ignored_sheets).toEqual(['Notes']);
      const income = report.sheets.find((s) => s.entity === 'finance-income')!;
      expect(income.rows.map((r) => r.status)).toEqual(['ready', 'error']);
      expect(income.rows[1].issues[0].message).toMatch(
        /'Nowhere' is not a valid Credit To Account/,
      );
      expect(report.sheets.find((s) => s.entity === 'students')!.sheet_error).toMatch(
        /don't have permission to import students/,
      );
      expect(report.sheets.find((s) => s.entity === 'finance-expenses')!.summary.total).toBe(0);
      expect(report.summary).toEqual({ total: 4, ready: 3, warning: 0, error: 1 });
    });

    it('imports sheets in order, re-checking each against records saved by earlier sheets', async () => {
      const accounts = (await repo.findFinanceAccounts()) as object[];
      const heads = (await repo.findFinanceHeads()) as object[];
      repo.findFinanceAccounts.mockImplementation(async () => accounts);
      repo.findFinanceHeads.mockImplementation(async () => heads);
      finance.createAccount.mockImplementation(
        async (dto: { name: string; account_type: string }) => {
          if (dto.name === 'Broken') throw new ConflictException('Bank rejected this account');
          const account = {
            id: `acc-${dto.name}`,
            name: dto.name,
            is_enabled: true,
            current_balance: '0',
            account_start_date: '2025-01-01',
            account_type: dto.account_type,
          };
          accounts.push(account);
          redis.store.delete(`finance:accounts:${SCHOOL}:bulk-import`);
          return account;
        },
      );
      finance.createIncome.mockImplementation(async () => ({ id: 'inc-1' }));

      const file = await workbookFile({
        'Finance Accounts': [
          ['Account Name', 'Account Type', 'Account Start Date'],
          ['HDFC', 'Bank', '2025-01-01'],
          ['Broken', 'Cash', '2025-01-01'],
        ],
        Income: [
          ['Date', 'Income Head', 'Credit To Account', 'Amount'],
          ['2025-05-01', 'Admission Fee', 'HDFC', 500],
          ['2025-05-02', 'Admission Fee', 'Broken', 300],
        ],
      });

      const started = await workbook.startImport(user, file, SCHOOL, USER, false);
      expect(started.sections.map((s) => [s.entity, s.status, s.total])).toEqual([
        ['finance-accounts', 'pending', 2],
        ['finance-income', 'pending', 2],
      ]);

      const done = await waitForWorkbook(started.job_id);
      expect(done.status).toBe('completed');
      const [accountSection, incomeSection] = done.sections;
      expect(accountSection).toMatchObject({ created: 1, failed: 1 });
      expect(accountSection.results[1].message).toBe('Bank rejected this account');
      expect(incomeSection).toMatchObject({ created: 1, failed: 1, processed: 2 });
      expect(incomeSection.results.find((r) => r.row === 3)!.message).toMatch(
        /'Broken' is not a valid Credit To Account/,
      );
      expect(finance.createIncome).toHaveBeenCalledWith(
        expect.objectContaining({ to_account_id: 'acc-HDFC', income_head_id: 'h1' }),
        SCHOOL,
        USER,
      );
      expect([...redis.store.keys()].filter((k) => k.startsWith('bulk_import:lock:'))).toEqual([]);
    });

    it('rejects CSV, unrecognised workbooks and locked entities with a clear reason', async () => {
      const csv = Buffer.from('a,b\n1,2\n');
      await expect(
        workbook.validate(user, { buffer: csv, originalname: 'x.csv', size: csv.length }, SCHOOL),
      ).rejects.toThrow(/upload .xlsx/);
      await expect(
        workbook.validate(user, await workbookFile({ Sheet1: [['x']] }), SCHOOL),
      ).rejects.toThrow(/No recognised sheets/);

      redis.store.set(`bulk_import:lock:${SCHOOL}:finance-heads`, 'other-job');
      const file = await workbookFile({
        Heads: [
          ['Head Name', 'Head Type'],
          ['Bus Fee', 'Income'],
        ],
      });
      await expect(workbook.startImport(user, file, SCHOOL, USER, true)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });
});
