import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuthRepository } from '../../auth/auth.repository';
import { RolesService } from '../../roles/roles.service';
import { hashPassword } from '../../../utils/hash.utils';
import { generateId } from '../../../utils/uuid.utils';
import { APP_EVENTS } from '../../../shared/events/event-names';
import { SchoolCreatedEvent } from './school.events';

/**
 * On school creation: seed the predefined system roles and, if the Super Admin
 * supplied an admin identifier, provision the School Admin account — with a
 * preset password (must_change_password:true) when one was given, otherwise the
 * existing passwordless flow (admin sets their own password via /auth/login).
 */
@Injectable()
export class SchoolCreatedListener {
  constructor(
    private readonly rolesService: RolesService,
    private readonly authRepo: AuthRepository,
  ) {}

  @OnEvent(APP_EVENTS.SCHOOL.CREATED)
  async handleSchoolCreated(event: SchoolCreatedEvent): Promise<void> {
    await this.rolesService.seedSystemRoles(event.schoolId);

    if (!event.adminPhone && !event.adminEmail) return;

    const dialCode = event.adminDialCode ?? '+91';
    const phone = event.adminPhone ?? '0000000000';

    const alreadyExists = event.adminPhone
      ? await this.authRepo.findSchoolUserByPhoneExists(phone, dialCode, event.schoolId)
      : false;
    if (alreadyExists) return;

    if (event.adminPassword) {
      const password_hash = await hashPassword(event.adminPassword);
      await this.authRepo.createSchoolUser({
        id: generateId(),
        school_id: event.schoolId,
        first_name: event.adminFirstName ?? 'Admin',
        last_name: event.adminLastName,
        dial_code: dialCode,
        phone_number: phone,
        email: event.adminEmail,
        password_hash,
        role: 'SCHOOL_ADMIN',
        created_by: event.createdBy,
        must_change_password: true,
      });
      return;
    }

    await this.authRepo.createSchoolUserWithoutPassword({
      id: generateId(),
      school_id: event.schoolId,
      first_name: event.adminFirstName ?? 'Admin',
      last_name: event.adminLastName,
      dial_code: dialCode,
      phone_number: phone,
      email: event.adminEmail,
      created_by: event.createdBy,
    });
  }
}
