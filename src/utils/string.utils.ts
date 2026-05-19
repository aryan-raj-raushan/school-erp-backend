export class StringUtils {
  static isEmpty(value: string | null | undefined): boolean {
    return value === null || value === undefined || value === '';
  }

  static isNotEmpty(value: string | null | undefined): boolean {
    return !StringUtils.isEmpty(value);
  }

  static isBlank(value: string | null | undefined): boolean {
    return StringUtils.isEmpty(value) || (value as string).trim() === '';
  }

  static isNotBlank(value: string | null | undefined): boolean {
    return !StringUtils.isBlank(value);
  }

  static trim(value: string | null | undefined): string {
    if (StringUtils.isEmpty(value)) return '';
    return (value as string).trim();
  }

  static capitalize(value: string): string {
    if (StringUtils.isBlank(value)) return '';
    const trimmed = value.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  }

  static titleCase(value: string): string {
    if (StringUtils.isBlank(value)) return '';
    return value
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  static camelToSnake(value: string): string {
    return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  static snakeToCamel(value: string): string {
    return value.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  static sanitize(value: string): string {
    if (StringUtils.isBlank(value)) return '';
    return value.replace(/<[^>]*>/g, '').trim();
  }

  static stripSpecialChars(value: string): string {
    if (StringUtils.isBlank(value)) return '';
    return value.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  }

  static normalizePhone(phone: string): string {
    if (StringUtils.isBlank(phone)) return '';
    return phone.replace(/[\s\-().+]/g, '');
  }

  static generateSlug(value: string): string {
    if (StringUtils.isBlank(value)) return '';
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  static maskEmail(email: string): string {
    if (StringUtils.isBlank(email)) return '';
    const [local, domain] = email.split('@');
    if (!domain) return email;
    const maskedLocal = local.slice(0, 2) + '***';
    const [domainName, ...rest] = domain.split('.');
    const maskedDomain = domainName.slice(0, 2) + '***';
    return `${maskedLocal}@${maskedDomain}.${rest.join('.')}`;
  }

  static maskPhone(phone: string): string {
    if (StringUtils.isBlank(phone) || phone.length < 6) return phone;
    return phone.slice(0, 2) + '*'.repeat(phone.length - 5) + phone.slice(-3);
  }

  static generateAdmissionNumber(schoolCode: string, year: number, sequence: number): string {
    const paddedSeq = String(sequence).padStart(5, '0');
    return `${schoolCode.toUpperCase()}/${year}/${paddedSeq}`;
  }

  static parseBoolean(value: string | undefined): boolean {
    return value === 'true' || value === '1' || value === 'yes';
  }

  static safeJsonParse<T>(value: string, fallback: T): T {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  static truncate(value: string, maxLength: number, suffix = '...'): string {
    if (StringUtils.isBlank(value)) return '';
    if (value.length <= maxLength) return value;
    return value.slice(0, maxLength - suffix.length) + suffix;
  }

  static format(template: string, params: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (_, key) =>
      key in params ? String(params[key]) : `{${key}}`,
    );
  }
}
