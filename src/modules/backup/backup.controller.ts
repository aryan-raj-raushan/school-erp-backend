import { Controller, Get, Param, ParseUUIDPipe, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { BackupService } from './backup.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { CompanyRole, SchoolRole } from '../../shared/enums';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@ApiTags('Backup')
@ApiBearerAuth('access-token')
@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  private async send(res: Response, schoolId: string) {
    const { buffer, filename } = await this.backupService.generate(schoolId);
    res.set({
      'Content-Type': XLSX_MIME,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get()
  @Roles(SchoolRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Download the current school's data backup as Excel" })
  async downloadOwn(@GetSchoolId() schoolId: string, @Res() res: Response) {
    await this.send(res, schoolId);
  }

  @Get('schools/:id')
  @Roles(CompanyRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Download any school's data backup as Excel (SUPER_ADMIN only)" })
  async downloadForSchool(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    await this.send(res, id);
  }
}
