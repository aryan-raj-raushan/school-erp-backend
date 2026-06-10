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
      const [totalStudents, totalStaff, attendanceSummary, pendingFees, upcomingExams] =
        await Promise.all([
          this.dashboardRepo.countStudents(schoolId),
          this.dashboardRepo.countStaff(schoolId),
          this.dashboardRepo.getTodayAttendanceSummary(schoolId, today),
          this.dashboardRepo.getPendingFees(schoolId),
          this.dashboardRepo.getUpcomingExams(schoolId),
        ]);

      return { totalStudents, totalStaff, attendanceSummary, pendingFees, upcomingExams };
    });
  }

  async getTeacherDashboard(schoolId: string, teacherId: string) {
    const today = new Date().toISOString().split('T')[0];
    const key = `dashboard:teacher:${schoolId}:${teacherId}:${today}`;

    return this.redisService.getOrSet(key, CacheTTL.SHORT, async () => {
      const [attendanceSummary, recentHomework, upcomingExams] = await Promise.all([
        this.dashboardRepo.getTodayAttendanceSummary(schoolId, today),
        this.dashboardRepo.getTeacherAssignedHomework(schoolId, teacherId),
        this.dashboardRepo.getUpcomingExams(schoolId),
      ]);

      return { attendanceSummary, recentHomework, upcomingExams };
    });
  }

  async getParentDashboard(schoolId: string, parentId: string) {
    const today = new Date().toISOString().split('T')[0];
    const key = `dashboard:parent:${schoolId}:${parentId}:${today}`;

    return this.redisService.getOrSet(key, CacheTTL.SHORT, async () => {
      const [recentHomework, upcomingExams, pendingFees] = await Promise.all([
        this.dashboardRepo.getRecentHomework(schoolId),
        this.dashboardRepo.getUpcomingExams(schoolId),
        this.dashboardRepo.getPendingFees(schoolId),
      ]);

      return { recentHomework, upcomingExams, pendingFees };
    });
  }

  async getAdminReports(schoolId: string) {
    const key = `reports:admin:${schoolId}`;
    return this.redisService.getOrSet(key, CacheTTL.SHORT, async () => {
      const [totalStudents, totalStaff, pendingFees] = await Promise.all([
        this.dashboardRepo.countStudents(schoolId),
        this.dashboardRepo.countStaff(schoolId),
        this.dashboardRepo.getPendingFees(schoolId),
      ]);
      return { totalStudents, totalStaff, pendingFees };
    });
  }

  async getSubjectAllocation(schoolId: string, classSectionId: string) {
    return this.dashboardRepo.getSubjectAllocation(schoolId, classSectionId);
  }
}
