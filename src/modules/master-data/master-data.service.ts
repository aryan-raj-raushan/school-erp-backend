import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MasterDataRepository } from './master-data.repository';
import { RedisService } from '../redis/redis.service';
import { CacheTTL } from '../../shared/constants';
import { REGEX } from '../../utils/regex.utils';

const PINCODE_API_URL = 'https://api.postalpincode.in/pincode';
const PINCODE_LOOKUP_TIMEOUT_MS = 5000;

export interface PincodeDetails {
  pincode: string;
  city: string;
  district: string;
  state: string;
  country: string;
  localities: string[];
}

interface PostOffice {
  Name: string;
  District: string;
  State: string;
  Country: string;
}

@Injectable()
export class MasterDataService {
  private readonly logger = new Logger(MasterDataService.name);

  constructor(
    private readonly repo: MasterDataRepository,
    private readonly redisService: RedisService,
  ) {}

  async findAllSubjects() {
    const key = 'master_data:subjects';
    return this.redisService.getOrSet(key, CacheTTL.HOUR, () => this.repo.findAllSubjects());
  }

  async lookupPincode(pincode: string): Promise<PincodeDetails> {
    if (!REGEX.PINCODE_IN.test(pincode)) {
      throw new BadRequestException('Pincode must be 6 digits and cannot start with 0');
    }
    return this.redisService.getOrSet(`master_data:pincode:${pincode}`, CacheTTL.LONG, () =>
      this.fetchPincode(pincode),
    );
  }

  private async fetchPincode(pincode: string): Promise<PincodeDetails> {
    let payload: Array<{ Status: string; PostOffice: PostOffice[] | null }>;
    try {
      const response = await fetch(`${PINCODE_API_URL}/${pincode}`, {
        signal: AbortSignal.timeout(PINCODE_LOOKUP_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      payload = (await response.json()) as typeof payload;
    } catch (error) {
      this.logger.warn(`Pincode lookup failed for ${pincode}: ${(error as Error).message}`);
      throw new ServiceUnavailableException(
        'Pincode lookup is unavailable right now — please enter city and state manually',
      );
    }

    const offices = payload?.[0]?.Status === 'Success' ? (payload[0].PostOffice ?? []) : [];
    if (!offices.length) throw new NotFoundException(`No location found for pincode ${pincode}`);

    const [first] = offices;
    return {
      pincode,
      city: first.District,
      district: first.District,
      state: first.State,
      country: first.Country,
      localities: offices.map((office) => office.Name),
    };
  }
}
