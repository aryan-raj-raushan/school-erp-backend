export enum LeaveRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum GenderEnum { MALE = 'MALE', FEMALE = 'FEMALE', OTHER = 'OTHER' }
export enum ReligionEnum {
  HINDU = 'HINDU', MUSLIM = 'MUSLIM', CHRISTIAN = 'CHRISTIAN',
  SIKH = 'SIKH', JAIN = 'JAIN', BUDDHIST = 'BUDDHIST', OTHER = 'OTHER',
}
export enum CategoryEnum { GENERAL = 'GENERAL', OBC = 'OBC', SC = 'SC', ST = 'ST', OTHER = 'OTHER' }