import { Injectable } from '@nestjs/common';
import { PermissionsService } from '../permissions/permissions.service';
import { SearchRepository } from './search.repository';
import { RedisService } from '../redis/redis.service';
import { GlobalSearchResult, SearchResultItem } from './types/search.types';

type CacheRecord = { id: string } & Record<string, unknown>;

const s = (v: unknown): string => (typeof v === 'string' ? v : '');

const LIMIT = 5;

@Injectable()
export class SearchService {
  constructor(
    private readonly searchRepo: SearchRepository,
    private readonly permissionsService: PermissionsService,
    private readonly redisService: RedisService,
  ) {}

  async globalSearch(
    query: string,
    schoolId: string,
    userId: string,
    customRoleId: string | null | undefined,
    enumRoleSlug: string,
  ): Promise<GlobalSearchResult> {
    const perms = await this.permissionsService.resolveUserPermissions(
      userId,
      schoolId,
      customRoleId,
      enumRoleSlug,
    );

    const t = `%${query}%`;

    const settled = await Promise.allSettled([
      perms.includes('students.view')
        ? this.withRedis(
            `students:${schoolId}:list:*`,
            ['first_name', 'last_name', 'phone_number', 'email'],
            query,
            (r) => ({
              id: r.id,
              type: 'student' as const,
              name: [s(r.first_name), s(r.last_name)].filter(Boolean).join(' '),
              subtitle: s(r.phone_number) || s(r.email) || '',
              meta:
                s(r.class_name) && s(r.section_name)
                  ? `${s(r.class_name)} · ${s(r.section_name)}`
                  : s(r.class_name) || undefined,
            }),
            () => this.searchRepo.searchStudents(t, schoolId),
          )
        : Promise.resolve([]),

      perms.includes('staff.view')
        ? this.withRedis(
            `staff:${schoolId}:list:*`,
            ['first_name', 'last_name', 'phone_number', 'email'],
            query,
            (r) => ({
              id: r.id,
              type: 'staff' as const,
              name: [s(r.first_name), s(r.last_name)].filter(Boolean).join(' '),
              subtitle: s(r.phone_number) || s(r.email) || '',
              meta: s(r.role) || undefined,
            }),
            () => this.searchRepo.searchStaff(t, schoolId),
          )
        : Promise.resolve([]),

      perms.includes('parents.view')
        ? this.withRedis(
            `parents:${schoolId}:list:*`,
            ['first_name', 'last_name', 'phone_number'],
            query,
            (r) => ({
              id: r.id,
              type: 'parent' as const,
              name: [s(r.first_name), s(r.last_name)].filter(Boolean).join(' '),
              subtitle: s(r.phone_number) || s(r.email) || '',
            }),
            () => this.searchRepo.searchParents(t, schoolId),
          )
        : Promise.resolve([]),

      perms.includes('admissions.view')
        ? this.withRedis(
            `admission_enquiries:${schoolId}:list:*`,
            ['student_name', 'phone'],
            query,
            (r) => ({
              id: r.id,
              type: 'admission' as const,
              name: s(r.student_name),
              subtitle: s(r.phone),
              meta: s(r.status) || undefined,
            }),
            () => this.searchRepo.searchAdmissions(t, schoolId),
          )
        : Promise.resolve([]),

      perms.includes('classes.view')
        ? this.withRedis(
            `classes:${schoolId}:*`,
            ['name'],
            query,
            (r) => ({
              id: r.id,
              type: 'class' as const,
              name: s(r.name),
              subtitle: 'Class',
            }),
            () => this.searchRepo.searchClasses(t, schoolId),
          )
        : Promise.resolve([]),

      perms.includes('subjects.view')
        ? this.withRedis(
            `subjects:${schoolId}:*`,
            ['name'],
            query,
            (r) => ({
              id: r.id,
              type: 'subject' as const,
              name: s(r.name),
              subtitle: 'Subject',
            }),
            () => this.searchRepo.searchSubjects(t, schoolId),
          )
        : Promise.resolve([]),

      perms.includes('departments.view')
        ? this.withRedis(
            `departments:${schoolId}:list:*`,
            ['name'],
            query,
            (r) => ({
              id: r.id,
              type: 'department' as const,
              name: s(r.name),
              subtitle: 'Department',
            }),
            () => this.searchRepo.searchDepartments(t, schoolId),
          )
        : Promise.resolve([]),

      perms.includes('fees.view')
        ? this.withRedis(
            `fees:${schoolId}:types:*`,
            ['name'],
            query,
            (r) => ({
              id: r.id,
              type: 'fee_type' as const,
              name: s(r.name),
              subtitle: 'Fee Type',
            }),
            () => this.searchRepo.searchFeeTypes(t, schoolId),
          )
        : Promise.resolve([]),

      perms.includes('events.view') || perms.includes('holidays.view')
        ? this.withRedis(
            `school_events:${schoolId}:list:*`,
            ['name'],
            query,
            (r) => ({
              id: r.id,
              type: 'event' as const,
              name: s(r.name),
              subtitle: r.type === 'HOLIDAY' ? 'Holiday' : 'Event',
            }),
            () => this.searchRepo.searchEvents(t, schoolId),
          )
        : Promise.resolve([]),

      perms.includes('academic_years.view')
        ? this.withRedis(
            `academic_years:${schoolId}:list:*`,
            ['name'],
            query,
            (r) => ({
              id: r.id,
              type: 'academic_year' as const,
              name: s(r.name),
              subtitle: r.is_active ? 'Current Year' : 'Academic Year',
            }),
            () => this.searchRepo.searchAcademicYears(t, schoolId),
          )
        : Promise.resolve([]),

      perms.includes('homework.view')
        ? this.withRedis(
            `academics:${schoolId}:hw:list:*`,
            ['title'],
            query,
            (r) => ({
              id: r.id,
              type: 'homework' as const,
              name: s(r.title),
              subtitle: 'Homework',
              meta: s(r.status) || undefined,
            }),
            () => this.searchRepo.searchHomework(t, schoolId),
          )
        : Promise.resolve([]),
    ]);

    const safe = (idx: number): SearchResultItem[] => {
      const r = settled[idx];
      return r.status === 'fulfilled' ? (r.value as SearchResultItem[]) : [];
    };

    return {
      students: safe(0),
      staff: safe(1),
      parents: safe(2),
      admissions: safe(3),
      classes: safe(4),
      subjects: safe(5),
      departments: safe(6),
      feeTypes: safe(7),
      events: safe(8),
      academicYears: safe(9),
      homework: safe(10),
      query,
    };
  }

  private async withRedis(
    pattern: string,
    fields: (keyof CacheRecord)[],
    term: string,
    mapper: (r: CacheRecord) => SearchResultItem,
    dbFallback: () => Promise<SearchResultItem[]>,
  ): Promise<SearchResultItem[]> {
    const cached = await this.redisService.getValuesByPattern<CacheRecord>(pattern);
    if (cached !== null) {
      return this.fuzzy(cached, fields, term).map(mapper);
    }
    return dbFallback();
  }

  private fuzzy(items: CacheRecord[], fields: (keyof CacheRecord)[], term: string): CacheRecord[] {
    const t = term.toLowerCase();
    return items
      .filter((item) =>
        fields.some((f) => {
          const v = item[f];
          return typeof v === 'string' && v.toLowerCase().includes(t);
        }),
      )
      .slice(0, LIMIT);
  }
}
