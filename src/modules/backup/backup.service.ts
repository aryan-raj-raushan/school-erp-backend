import { Injectable, NotFoundException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { BackupRepository } from './backup.repository';

type Column = { header: string; key: string; width: number };

const fullName = (first?: string | null, last?: string | null) =>
  [first, last].filter(Boolean).join(' ');

const formatDate = (value?: string | Date | null) =>
  value ? new Date(value).toISOString().slice(0, 10) : '';

@Injectable()
export class BackupService {
  constructor(private readonly repo: BackupRepository) {}

  private addSheet(
    workbook: ExcelJS.Workbook,
    name: string,
    columns: Column[],
    rows: Record<string, unknown>[],
  ) {
    const sheet = workbook.addWorksheet(name);
    sheet.columns = columns;
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9ECEF' } };
    headerRow.alignment = { vertical: 'middle' };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.addRows(rows);
  }

  async generate(schoolId: string): Promise<{ buffer: Buffer; filename: string }> {
    const school = await this.repo.findSchool(schoolId);
    if (!school) throw new NotFoundException('School not found');

    const [classRows, studentRows, parentRows, staffRows, paymentRows] = await Promise.all([
      this.repo.findClassesAndSections(schoolId),
      this.repo.findStudents(schoolId),
      this.repo.findParents(schoolId),
      this.repo.findStaff(schoolId),
      this.repo.findFeePayments(schoolId),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.created = new Date();

    this.addSheet(
      workbook,
      'School',
      [
        { header: 'Field', key: 'field', width: 22 },
        { header: 'Value', key: 'value', width: 50 },
      ],
      [
        ['Name', school.name],
        ['Code', school.code],
        ['Board', school.board_type],
        ['Contact Number', school.contact_number],
        ['Email', school.email],
        ['Address', school.address],
        ['City', school.city],
        ['State', school.state],
        ['Pincode', school.pincode],
        ['Backup Taken At', new Date().toISOString()],
      ].map(([field, value]) => ({ field, value: value ?? '' })),
    );

    this.addSheet(
      workbook,
      'Classes & Sections',
      [
        { header: 'Academic Year', key: 'academic_year', width: 16 },
        { header: 'Class', key: 'class_name', width: 14 },
        { header: 'Section', key: 'section_name', width: 10 },
        { header: 'Room', key: 'room_number', width: 10 },
        { header: 'Max Strength', key: 'max_strength', width: 14 },
        { header: 'Class Teacher', key: 'class_teacher', width: 26 },
      ],
      classRows.map((r) => ({
        ...r,
        section_name: r.section_name ?? '',
        class_teacher: fullName(r.teacher_first_name, r.teacher_last_name),
      })),
    );

    this.addSheet(
      workbook,
      'Students',
      [
        { header: 'Admission No', key: 'admission_number', width: 18 },
        { header: 'Registration No', key: 'registration_number', width: 18 },
        { header: 'Roll No', key: 'roll_number', width: 9 },
        { header: 'Student Name', key: 'name', width: 26 },
        { header: 'Class', key: 'class_name', width: 12 },
        { header: 'Section', key: 'section_name', width: 9 },
        { header: 'Gender', key: 'gender', width: 10 },
        { header: 'Date of Birth', key: 'date_of_birth', width: 14 },
        { header: 'Phone', key: 'phone_number', width: 14 },
        { header: 'Email', key: 'email', width: 26 },
        { header: 'Joining Date', key: 'joining_date', width: 14 },
        { header: 'Status', key: 'status', width: 12 },
      ],
      studentRows.map((r) => ({
        ...r,
        name: fullName(r.first_name, r.last_name),
        date_of_birth: formatDate(r.date_of_birth),
        joining_date: formatDate(r.joining_date),
      })),
    );

    this.addSheet(
      workbook,
      'Parents',
      [
        { header: 'Student Name', key: 'student_name', width: 26 },
        { header: 'Admission No', key: 'admission_number', width: 18 },
        { header: 'Relation', key: 'relation', width: 12 },
        { header: 'Parent Name', key: 'name', width: 26 },
        { header: 'Phone', key: 'phone', width: 16 },
        { header: 'Email', key: 'email', width: 26 },
        { header: 'Occupation', key: 'occupation', width: 18 },
        { header: 'Primary', key: 'primary', width: 9 },
        { header: 'App Login', key: 'login', width: 10 },
      ],
      parentRows.map((r) => ({
        ...r,
        student_name: fullName(r.student_first_name, r.student_last_name),
        name: fullName(r.first_name, r.last_name),
        phone: `${r.dial_code} ${r.phone_number}`,
        primary: r.is_primary ? 'Yes' : 'No',
        login: r.has_login ? 'Yes' : 'No',
      })),
    );

    this.addSheet(
      workbook,
      'Staff',
      [
        { header: 'Employee Code', key: 'employee_code', width: 16 },
        { header: 'Name', key: 'name', width: 26 },
        { header: 'Role', key: 'role', width: 16 },
        { header: 'Phone', key: 'phone', width: 16 },
        { header: 'Email', key: 'email', width: 26 },
        { header: 'Gender', key: 'gender', width: 10 },
        { header: 'Joining Date', key: 'joining_date', width: 14 },
        { header: 'Qualification', key: 'qualification', width: 20 },
        { header: 'Active', key: 'active', width: 8 },
      ],
      staffRows.map((r) => ({
        ...r,
        name: fullName(r.first_name, r.last_name),
        phone: `${r.dial_code} ${r.phone_number}`,
        joining_date: formatDate(r.joining_date),
        active: r.is_active ? 'Yes' : 'No',
      })),
    );

    this.addSheet(
      workbook,
      'Fee Payments',
      [
        { header: 'Payment Date', key: 'payment_date', width: 14 },
        { header: 'Admission No', key: 'admission_number', width: 18 },
        { header: 'Student Name', key: 'student_name', width: 26 },
        { header: 'Fee Type', key: 'fee_type', width: 20 },
        { header: 'Month', key: 'bill_month', width: 10 },
        { header: 'Amount', key: 'amount', width: 12 },
        { header: 'Mode', key: 'payment_mode', width: 12 },
        { header: 'Transaction ID', key: 'transaction_id', width: 22 },
      ],
      paymentRows.map((r) => ({
        ...r,
        student_name: fullName(r.student_first_name, r.student_last_name),
        amount: Number(r.amount),
      })),
    );

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const code = school.code ?? 'school';
    return { buffer, filename: `${code}_backup_${formatDate(new Date())}.xlsx` };
  }
}
