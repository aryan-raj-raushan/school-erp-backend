import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '../../../shared/enums/document-type.enum';

export class CreateDocumentDto {
  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  @IsNotEmpty()
  document_type: DocumentType;

  @ApiProperty({ example: 'birth-certificate.pdf' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  file_name: string;

  @ApiProperty({ example: 'https://s3.amazonaws.com/bucket/file.pdf' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  file_url: string;

  @ApiPropertyOptional({ example: '204800' })
  @IsOptional()
  @IsString()
  file_size?: string;

  @ApiPropertyOptional({ example: 'application/pdf' })
  @IsOptional()
  @IsString()
  mime_type?: string;

  @ApiPropertyOptional({ example: 'uploads/students/docs/file.pdf' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  s3_key?: string;
}
