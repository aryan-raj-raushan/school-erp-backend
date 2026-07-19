export interface SchoolCreatedEvent {
  schoolId: string;
  createdBy: string;
  adminFirstName?: string;
  adminLastName?: string;
  adminDialCode?: string;
  adminPhone?: string;
  adminEmail?: string;
  adminPassword?: string;
}
