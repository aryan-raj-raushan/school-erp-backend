export class DateUtils {
  static nowISO(): string {
    return new Date().toISOString();
  }

  static toDate(value: string | Date): Date {
    return typeof value === 'string' ? new Date(value) : value;
  }

  static isExpired(date: Date | string): boolean {
    return new Date(date) < new Date();
  }

  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  static addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  static formatDate(date: Date | string, locale = 'en-IN'): string {
    return new Date(date).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  static diffInDays(from: Date, to: Date): number {
    const ms = to.getTime() - from.getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }

  static currentAcademicYear(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const startYear = month >= 4 ? year : year - 1;
    return `${startYear}-${String(startYear + 1).slice(2)}`;
  }
}
