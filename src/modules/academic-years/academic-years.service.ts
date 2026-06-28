import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { AcademicYearsRepository } from './academic-years.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto';
import { AcademicYear } from './types/academic-year.types';
import { CacheTTL } from '../../shared/constants';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { academicYears } from '../../database/drizzle/schema/academic-years.schema';
import { leavePolicies, leaveBalances } from '../../database/drizzle/schema/leave.schema';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class AcademicYearsService {
  constructor(
    private readonly academicYearsRepo: AcademicYearsRepository,
    private readonly redisService: RedisService,
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDB,
  ) {}

  private cacheKey(schoolId: string): string {
    return `academic_years:${schoolId}`;
  }

  async findAll(
    schoolId: string,
    page: number,
    limit: number,
  ): Promise<PaginationResponse<AcademicYear>> {
    const key = `${this.cacheKey(schoolId)}:list:${page}:${limit}`;
    return this.redisService.getOrSet(key, CacheTTL.LONG, async () => {
      const [items, total] = await Promise.all([
        this.academicYearsRepo.findAll(schoolId, page, limit),
        this.academicYearsRepo.count(schoolId),
      ]);
      return PaginationResponse.of(items, total, { page, limit });
    });
  }

  async findById(id: string, schoolId: string): Promise<AcademicYear> {
    const key = `${this.cacheKey(schoolId)}:${id}`;
    return this.redisService.getOrSet(key, CacheTTL.LONG, async () => {
      const academicYear = await this.academicYearsRepo.findById(id, schoolId);
      if (!academicYear) {
        throw new NotFoundException(`Academic year with id '${id}' not found`);
      }
      return academicYear;
    });
  }

  async findCurrent(schoolId: string): Promise<AcademicYear> {
    const key = `${this.cacheKey(schoolId)}:current`;
    return this.redisService.getOrSet(key, CacheTTL.LONG, async () => {
      const academicYear = await this.academicYearsRepo.findCurrent(schoolId);
      if (!academicYear) {
        throw new NotFoundException(`No current academic year set for this school`);
      }
      return academicYear;
    });
  }

  async create(
    dto: CreateAcademicYearDto,
    schoolId: string,
    createdBy: string,
  ): Promise<AcademicYear> {
    if (dto.is_enabled) {
      await this.academicYearsRepo.disableAll(schoolId);
    }
    const academicYear = await this.academicYearsRepo.create({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      ...dto,
      is_current: dto.is_current ?? false,
      is_enabled: dto.is_enabled ?? true,
    });
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return academicYear;
  }

  async update(id: string, schoolId: string, dto: UpdateAcademicYearDto): Promise<AcademicYear> {
    await this.findById(id, schoolId);
    if (dto.is_enabled) {
      await this.academicYearsRepo.disableAll(schoolId);
    }
    const updated = await this.academicYearsRepo.update(id, schoolId, dto);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return updated;
  }

  async setCurrent(id: string, schoolId: string): Promise<AcademicYear> {
    await this.findById(id, schoolId);
    const updated = await this.academicYearsRepo.setCurrent(id, schoolId);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return updated;
  }

  async freeze(id: string, schoolId: string, frozenBy: string): Promise<AcademicYear> {
    await this.findById(id, schoolId);
    const [updated] = await this.db
      .update(academicYears)
      .set({ is_frozen: true, frozen_by: frozenBy, frozen_at: new Date() })
      .where(and(eq(academicYears.id, id), eq(academicYears.school_id, schoolId)))
      .returning();
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return updated as unknown as AcademicYear;
  }

  async unfreeze(id: string, schoolId: string): Promise<AcademicYear> {
    await this.findById(id, schoolId);
    const [updated] = await this.db
      .update(academicYears)
      .set({ is_frozen: false, frozen_by: null, frozen_at: null })
      .where(and(eq(academicYears.id, id), eq(academicYears.school_id, schoolId)))
      .returning();
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return updated as unknown as AcademicYear;
  }

  async rollover(fromId: string, toId: string, schoolId: string): Promise<{ message: string }> {
    const [fromYear, toYear] = await Promise.all([
      this.findById(fromId, schoolId),
      this.findById(toId, schoolId),
    ]);

    // Set new year as current
    await this.academicYearsRepo.setCurrent(toId, schoolId);

    // Copy leave policies to new year
    const policies = await this.db
      .select()
      .from(leavePolicies)
      .where(and(eq(leavePolicies.school_id, schoolId), eq(leavePolicies.academic_year_id, fromId)));

    for (const p of policies) {
      await this.db.insert(leavePolicies).values({
        ...p,
        id: generateId(),
        academic_year_id: toId,
        created_at: new Date(),
        updated_at: null,
      }).onConflictDoNothing();
    }

    // Carry forward leave balances: allocate same amount in new year
    const balances = await this.db
      .select()
      .from(leaveBalances)
      .where(and(eq(leaveBalances.school_id, schoolId), eq(leaveBalances.academic_year_id, fromId)));

    for (const b of balances) {
      const carry = Math.max(0, b.allocated - b.used);
      await this.db.insert(leaveBalances).values({
        id: generateId(),
        school_id: schoolId,
        staff_id: b.staff_id,
        leave_type_id: b.leave_type_id,
        allocated: b.allocated,
        used: 0,
        carried_forward: carry,
        academic_year_id: toId,
        can_go_negative: b.can_go_negative,
        created_at: new Date(),
      }).onConflictDoNothing();
    }

    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return { message: `Rolled over from ${fromYear.name} to ${toYear.name}` };
  }
}
