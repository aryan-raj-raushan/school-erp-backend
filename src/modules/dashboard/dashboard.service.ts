import { Injectable } from '@nestjs/common';
import { DashboardRepository } from './dashboard.repository';
import { RedisService } from '../redis/redis.service';
import { CacheTTL } from '../../shared/constants';

@Injectable()
export class DashboardService {
  constructor(
    private readonly dashboardRepo: DashboardRepository,
    private readonly redisService: RedisService,
  ) {}

  async getAdminDashboard(schoolId: string) {
    const today = new Date().toISOString().split('T')[0];
    const key = `dashboard:admin:${schoolId}:${today}`;

    return this.redisService.getOrSet(key, CacheTTL.SHORT, async () => {
      const [
        totalStudents,
        totalStaff,
        totalParents,
        totalClasses,
        totalDepartments,
        totalSubjects,
        attendanceSummary,
        attendanceTrend,
        feesCollection,
        pendingFees,
        admissionBreakdown,
        genderBreakdown,
        classwiseStudents,
        pendingLeave,
        upcomingEvents,
        homeworkStatus,
        recentHomework,
        upcomingExams,
        financeSummary,
        pendingSalary,
        currentAcademicYear,
      ] = await Promise.all([
        this.dashboardRepo.countStudents(schoolId),
        this.dashboardRepo.countStaff(schoolId),
        this.dashboardRepo.countParents(schoolId),
        this.dashboardRepo.countClasses(schoolId),
        this.dashboardRepo.countDepartments(schoolId),
        this.dashboardRepo.countSubjects(schoolId),
        this.dashboardRepo.getTodayAttendanceSummary(schoolId, today),
        this.dashboardRepo.getAttendanceTrend(schoolId, 7),
        this.dashboardRepo.getFeesCollectionSummary(schoolId),
        this.dashboardRepo.getPendingFees(schoolId),
        this.dashboardRepo.getAdmissionStatusBreakdown(schoolId),
        this.dashboardRepo.getStudentGenderBreakdown(schoolId),
        this.dashboardRepo.getClasswiseStudentCount(schoolId),
        this.dashboardRepo.getPendingLeaveRequests(schoolId),
        this.dashboardRepo.getUpcomingEvents(schoolId),
        this.dashboardRepo.getHomeworkStatusBreakdown(schoolId),
        this.dashboardRepo.getRecentHomework(schoolId),
        this.dashboardRepo.getUpcomingExams(schoolId),
        this.dashboardRepo.getFinanceSummary(schoolId),
        this.dashboardRepo.getPendingSalaryCount(schoolId),
        this.dashboardRepo.getCurrentAcademicYear(schoolId),
      ]);

      // Compute attendance rate from today's summary
      const presentCount = attendanceSummary.find((r) => r.status === 'PRESENT')?.count ?? 0;
      const absentCount = attendanceSummary.find((r) => r.status === 'ABSENT')?.count ?? 0;
      const totalMarked = Number(presentCount) + Number(absentCount);
      const attendanceRate =
        totalMarked > 0 ? Math.round((Number(presentCount) / totalMarked) * 100) : null;

      // Compute fees totals
      const totalFeesBilled = feesCollection.reduce((s, r) => s + Number(r.total ?? 0), 0);
      const totalFeesPaid = feesCollection.reduce((s, r) => s + Number(r.paid ?? 0), 0);
      const totalFeesPending = totalFeesBilled - totalFeesPaid;

      return {
        date: today,
        currentAcademicYear,
        counts: {
          students: totalStudents,
          staff: totalStaff,
          parents: totalParents,
          classes: totalClasses,
          departments: totalDepartments,
          subjects: totalSubjects,
        },
        attendance: {
          today: attendanceSummary,
          rate: attendanceRate,
          present: Number(presentCount),
          absent: Number(absentCount),
          trend: this.buildAttendanceTrend(attendanceTrend),
        },
        fees: {
          totalBilled: totalFeesBilled,
          totalCollected: totalFeesPaid,
          totalPending: totalFeesPending,
          pendingCount: pendingFees,
          byStatus: feesCollection,
        },
        admissions: {
          byStatus: admissionBreakdown,
        },
        students: {
          byGender: genderBreakdown,
          byClass: classwiseStudents,
        },
        leave: {
          pending: pendingLeave,
        },
        events: {
          upcoming: upcomingEvents,
        },
        homework: {
          byStatus: homeworkStatus,
          recent: recentHomework,
        },
        exams: {
          upcoming: upcomingExams,
        },
        finance: {
          ...financeSummary,
          pendingSalaryCount: pendingSalary,
        },
      };
    });
  }

  private buildAttendanceTrend(
    rows: { date: string; status: string; count: number }[],
  ): { date: string; present: number; absent: number }[] {
    const map = new Map<string, { present: number; absent: number }>();
    for (const row of rows) {
      if (!map.has(row.date)) map.set(row.date, { present: 0, absent: 0 });
      const entry = map.get(row.date)!;
      if (row.status === 'PRESENT') entry.present = Number(row.count);
      else if (row.status === 'ABSENT') entry.absent = Number(row.count);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));
  }

  async getTeacherDashboard(schoolId: string, teacherId: string) {
    const today = new Date().toISOString().split('T')[0];
    const key = `dashboard:teacher:${schoolId}:${teacherId}:${today}`;

    return this.redisService.getOrSet(key, CacheTTL.SHORT, async () => {
      const [attendanceSummary, recentHomework, upcomingExams, upcomingEvents] = await Promise.all([
        this.dashboardRepo.getTodayAttendanceSummary(schoolId, today),
        this.dashboardRepo.getTeacherAssignedHomework(schoolId, teacherId),
        this.dashboardRepo.getUpcomingExams(schoolId),
        this.dashboardRepo.getUpcomingEvents(schoolId, 3),
      ]);

      return { attendanceSummary, recentHomework, upcomingExams, upcomingEvents };
    });
  }

  async getParentDashboard(schoolId: string, parentId: string) {
    const today = new Date().toISOString().split('T')[0];
    const key = `dashboard:parent:${schoolId}:${parentId}:${today}`;

    return this.redisService.getOrSet(key, CacheTTL.SHORT, async () => {
      const [recentHomework, upcomingExams, pendingFees, upcomingEvents] = await Promise.all([
        this.dashboardRepo.getRecentHomework(schoolId),
        this.dashboardRepo.getUpcomingExams(schoolId),
        this.dashboardRepo.getPendingFees(schoolId),
        this.dashboardRepo.getUpcomingEvents(schoolId, 3),
      ]);

      return { recentHomework, upcomingExams, pendingFees, upcomingEvents };
    });
  }

  async getAdminReports(schoolId: string) {
    const key = `reports:admin:${schoolId}`;
    return this.redisService.getOrSet(key, CacheTTL.SHORT, async () => {
      const [totalStudents, totalStaff, feesCollection, admissionBreakdown, genderBreakdown] =
        await Promise.all([
          this.dashboardRepo.countStudents(schoolId),
          this.dashboardRepo.countStaff(schoolId),
          this.dashboardRepo.getFeesCollectionSummary(schoolId),
          this.dashboardRepo.getAdmissionStatusBreakdown(schoolId),
          this.dashboardRepo.getStudentGenderBreakdown(schoolId),
        ]);
      return { totalStudents, totalStaff, feesCollection, admissionBreakdown, genderBreakdown };
    });
  }

  async getSubjectAllocation(schoolId: string, classSectionId: string) {
    return this.dashboardRepo.getSubjectAllocation(schoolId, classSectionId);
  }

  // Invalidate dashboard cache when mutations happen
  async invalidateAdminCache(schoolId: string) {
    await this.redisService.delByPattern(`dashboard:admin:${schoolId}:*`);
  }
}
