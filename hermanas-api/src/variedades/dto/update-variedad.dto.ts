import { PartialType } from '@nestjs/mapped-types';
import { CreateVariedadDto } from './create-variedad.dto';

export class UpdateVariedadDto extends PartialType(CreateVariedadDto) {}
