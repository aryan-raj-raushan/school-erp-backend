import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { masterSubjects } from '../../database/drizzle/schema/master-subjects.schema';

@Injectable()
export class MasterDataRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async findAllSubjects() {
    return this.db
      .select({ id: masterSubjects.id, subject_name: masterSubjects.name, subject_code: masterSubjects.code })
      .from(masterSubjects)
      .where(eq(masterSubjects.is_active, true))
      .orderBy(masterSubjects.name);
  }
}
