import { relations } from 'drizzle-orm';
import { schools } from './schools.schema';
import { companyUsers } from './company-users.schema';
import { companyUserSchools } from './company-user-schools.schema';
import { schoolUsers } from './school-users.schema';
import { academicYears } from './academic-years.schema';
import { classes } from './classes.schema';
import { sections } from './sections.schema';
import { subjects } from './subjects.schema';
import { studentAcademicInfo, students } from './students.schema';
import { studentDocuments } from './student-documents.schema';
import { parents, parentStudentLinks } from './parents.schema';
import { subscriptions } from './subscriptions.schema';
import { subscriptionPlans } from './subscription-plans.schema';
import { subscriptionPayments } from './subscription-payments.schema';
import { subscriptionOneTimeCharges } from './subscription-one-time-charges.schema';
import { invoices, invoiceLineItems } from './invoices.schema';
import { rfidDevices } from './rfid-devices.schema';
import { promotionLogs } from './promotion-logs.schema';
import { syllabi, syllabusAttachments } from './syllabi.schema';

export const schoolsRelations = relations(schools, ({ many }) => ({
  users: many(schoolUsers),
  academicYears: many(academicYears),
  classes: many(classes),
  sections: many(sections),
  subjects: many(subjects),
  students: many(students),
  subscriptions: many(subscriptions),
  companyUserSchools: many(companyUserSchools),
}));

export const companyUsersRelations = relations(companyUsers, ({ many }) => ({
  schoolAccess: many(companyUserSchools),
}));

export const companyUserSchoolsRelations = relations(companyUserSchools, ({ one }) => ({
  user: one(companyUsers, { fields: [companyUserSchools.user_id], references: [companyUsers.id] }),
  school: one(schools, { fields: [companyUserSchools.school_id], references: [schools.id] }),
}));

export const schoolUsersRelations = relations(schoolUsers, ({ one, many }) => ({
  school: one(schools, { fields: [schoolUsers.school_id], references: [schools.id] }),
  sectionsAsClassTeacher: many(sections),
}));

export const academicYearsRelations = relations(academicYears, ({ one, many }) => ({
  school: one(schools, { fields: [academicYears.school_id], references: [schools.id] }),
  classes: many(classes),
  students: many(students),
}));

export const syllabiRelations = relations(syllabi, ({ one, many }) => ({
  school: one(schools, { fields: [syllabi.school_id], references: [schools.id] }),
  class: one(classes, { fields: [syllabi.class_id], references: [classes.id] }),
  attachments: many(syllabusAttachments),
}));

export const syllabusAttachmentsRelations = relations(syllabusAttachments, ({ one }) => ({
  syllabus: one(syllabi, { fields: [syllabusAttachments.syllabus_id], references: [syllabi.id] }),
  school: one(schools, { fields: [syllabusAttachments.school_id], references: [schools.id] }),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  school: one(schools, { fields: [classes.school_id], references: [schools.id] }),
  academicYear: one(academicYears, {
    fields: [classes.academic_year_id],
    references: [academicYears.id],
  }),
  sections: many(sections),
  subjects: many(subjects),
  students: many(students),
}));

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  school: one(schools, { fields: [sections.school_id], references: [schools.id] }),
  class: one(classes, { fields: [sections.class_id], references: [classes.id] }),
  classTeacher: one(schoolUsers, {
    fields: [sections.class_teacher_id],
    references: [schoolUsers.id],
  }),
  students: many(students),
}));

export const subjectsRelations = relations(subjects, ({ one }) => ({
  school: one(schools, { fields: [subjects.school_id], references: [schools.id] }),
  class: one(classes, { fields: [subjects.class_id], references: [classes.id] }),
}));

export const studentAcademicInfoRelations = relations(studentAcademicInfo, ({ one }) => ({
  student: one(students, {
    fields: [studentAcademicInfo.student_id],
    references: [students.id],
  }),

  academicYear: one(academicYears, {
    fields: [studentAcademicInfo.academic_year_id],
    references: [academicYears.id],
  }),

  class: one(classes, {
    fields: [studentAcademicInfo.class_id],
    references: [classes.id],
  }),

  section: one(sections, {
    fields: [studentAcademicInfo.section_id],
    references: [sections.id],
  }),

  school: one(schools, {
    fields: [studentAcademicInfo.school_id],
    references: [schools.id],
  }),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  school: one(schools, {
    fields: [students.school_id],
    references: [schools.id],
  }),

  // New relation
  academicInfo: many(studentAcademicInfo),

  documents: many(studentDocuments),

  parentLinks: many(parentStudentLinks),
}));

// export const studentsRelations = relations(students, ({ one, many }) => ({
//   school: one(schools, { fields: [students.school_id], references: [schools.id] }),
//   academicYear: one(academicYears, {
//     fields: [students.academic_year_id],
//     references: [academicYears.id],
//   }),
//   class: one(classes, { fields: [students.class_id], references: [classes.id] }),
//   section: one(sections, { fields: [students.section_id], references: [sections.id] }),
//   documents: many(studentDocuments),
//   parentLinks: many(parentStudentLinks),
// }));

export const studentDocumentsRelations = relations(studentDocuments, ({ one }) => ({
  school: one(schools, { fields: [studentDocuments.school_id], references: [schools.id] }),
  student: one(students, { fields: [studentDocuments.student_id], references: [students.id] }),
}));

export const parentsRelations = relations(parents, ({ one, many }) => ({
  school: one(schools, { fields: [parents.school_id], references: [schools.id] }),
  studentLinks: many(parentStudentLinks),
}));

export const parentStudentLinksRelations = relations(parentStudentLinks, ({ one }) => ({
  school: one(schools, { fields: [parentStudentLinks.school_id], references: [schools.id] }),
  parent: one(parents, { fields: [parentStudentLinks.parent_id], references: [parents.id] }),
  student: one(students, { fields: [parentStudentLinks.student_id], references: [students.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  school: one(schools, { fields: [subscriptions.school_id], references: [schools.id] }),
  plan: one(subscriptionPlans, {
    fields: [subscriptions.plan_id],
    references: [subscriptionPlans.id],
  }),
  payments: many(subscriptionPayments),
}));

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

export const subscriptionPaymentsRelations = relations(subscriptionPayments, ({ one }) => ({
  school: one(schools, { fields: [subscriptionPayments.school_id], references: [schools.id] }),
  subscription: one(subscriptions, {
    fields: [subscriptionPayments.subscription_id],
    references: [subscriptions.id],
  }),
}));

export const subscriptionOneTimeChargesRelations = relations(
  subscriptionOneTimeCharges,
  ({ one }) => ({
    school: one(schools, {
      fields: [subscriptionOneTimeCharges.school_id],
      references: [schools.id],
    }),
    subscription: one(subscriptions, {
      fields: [subscriptionOneTimeCharges.subscription_id],
      references: [subscriptions.id],
    }),
  }),
);

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  school: one(schools, { fields: [invoices.school_id], references: [schools.id] }),
  subscription: one(subscriptions, {
    fields: [invoices.subscription_id],
    references: [subscriptions.id],
  }),
  lineItems: many(invoiceLineItems),
}));

export const invoiceLineItemsRelations = relations(invoiceLineItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceLineItems.invoice_id], references: [invoices.id] }),
}));

export const rfidDevicesRelations = relations(rfidDevices, ({ one }) => ({
  assignedSchool: one(schools, {
    fields: [rfidDevices.assigned_school_id],
    references: [schools.id],
  }),
}));

export const promotionLogsRelations = relations(promotionLogs, ({ one }) => ({
  school: one(schools, { fields: [promotionLogs.school_id], references: [schools.id] }),
  fromAcademicYear: one(academicYears, {
    fields: [promotionLogs.from_academic_year_id],
    references: [academicYears.id],
  }),
  toAcademicYear: one(academicYears, {
    fields: [promotionLogs.to_academic_year_id],
    references: [academicYears.id],
  }),
}));
