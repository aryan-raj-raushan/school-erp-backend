import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuthRepository } from '../../auth/auth.repository';
import { RolesService } from '../../roles/roles.service';
import { hashPassword } from '../../../utils/hash.utils';
import { generateId } from '../../../utils/uuid.utils';
import { APP_EVENTS } from '../../../shared/events/event-names';
import { SchoolCreatedEvent } from './school.events';

@Injectable()
export class SchoolCreatedListener {
  constructor(
    private readonly rolesService: RolesService,
    private readonly authRepo: AuthRepository,
  ) {}

  @OnEvent(APP_EVENTS.SCHOOL.CREATED)
  async handleSchoolCreated(event: SchoolCreatedEvent): Promise<void> {
    await this.rolesService.seedSystemRoles(event.schoolId);

    if (!event.adminPassword || (!event.adminPhone && !event.adminEmail)) return;

    const dialCode = event.adminDialCode ?? '+91';
    const phone = event.adminPhone ?? '0000000000';

    const alreadyExists = event.adminPhone
      ? await this.authRepo.findSchoolUserByPhoneExists(phone, dialCode, event.schoolId)
      : false;
    if (alreadyExists) return;

    await this.authRepo.createSchoolUser({
      id: generateId(),
      school_id: event.schoolId,
      first_name: event.adminFirstName ?? 'Admin',
      last_name: event.adminLastName,
      dial_code: dialCode,
      phone_number: phone,
      email: event.adminEmail,
      password_hash: await hashPassword(event.adminPassword),
      role: 'SCHOOL_ADMIN',
      created_by: event.createdBy,
      must_change_password: true,
    });
  }
}
