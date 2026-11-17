import { DateUtils } from '../../utils/date.utils';

export function attendanceLockReason(
  record: { mode: string | null; date: string },
  today: string = DateUtils.zonedDateTime(new Date()).date,
): string | null {
  if (record.mode === 'RFID') return 'Smart-card (RFID) attendance cannot be edited';
  if (record.mode === 'APP' && record.date === today) {
    return 'Attendance punched in from the app cannot be edited on the same day';
  }
  return null;
}
