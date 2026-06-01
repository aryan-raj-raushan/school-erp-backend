import { Module } from '@nestjs/common';
import {
  ExamsController,
  ExamPolicyController,
  ExamTimetableController,
  ExamStudentsController,
  ExamRoomsController,
  ExamSeatingController,
  AdmitCardsController,
  ExamMarksController,
  TeacherRemarksController,
  MarkSheetController,
} from './exams.controller';
import { ExamsService } from './exams.service';
import { ExamsRepository } from './exams.repository';

@Module({
  controllers: [
    ExamsController,
    ExamPolicyController,
    ExamTimetableController,
    ExamStudentsController,
    ExamRoomsController,
    ExamSeatingController,
    AdmitCardsController,
    ExamMarksController,
    TeacherRemarksController,
    MarkSheetController,
  ],
  providers: [ExamsService, ExamsRepository],
  exports: [ExamsService, ExamsRepository],
})
export class ExamsModule {}
