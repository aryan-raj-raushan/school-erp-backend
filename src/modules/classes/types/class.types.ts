import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { classes } from '../../../database/drizzle/schema/classes.schema';
import { sections } from '../../../database/drizzle/schema/sections.schema';

export type Class = InferSelectModel<typeof classes>;
export type NewClass = InferInsertModel<typeof classes>;
export type Section = InferSelectModel<typeof sections>;
export type NewSection = InferInsertModel<typeof sections>;

export interface ClassSectionView {
  id: string;
  display_name: string;
  class_id: string;
  class_name: string;
  section_name: string;
  numeric_value: number | null;
  school_id: string;
  academic_year_id: string;
  class_teacher_id: string | null;
  class_teacher_name: string | null;
  room_number: string | null;
  student_capacity: number | null;
  is_active: boolean;
  deleted: boolean;
  created_at: Date;
  updated_at: Date | null;
}
