import { Injectable } from '@nestjs/common';
import { MasterDataRepository } from './master-data.repository';

@Injectable()
export class MasterDataService {
  constructor(private readonly repo: MasterDataRepository) {}

  async findAllSubjects() {
    return this.repo.findAllSubjects();
  }
}
