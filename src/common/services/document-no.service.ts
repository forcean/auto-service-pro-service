import { Injectable, Inject } from '@nestjs/common';
import { CounterRepository } from 'src/repository/counters/counter.repository';
import { EDocumentType } from '../enums/document-type.enum';
import { DOCUMENT_PREFIX } from '../constants/document-prefix.constant';

@Injectable()
export class DocumentNoService {
  constructor(
    @Inject(CounterRepository)
    private readonly counterRepository: CounterRepository,
  ) {}

  async generate(type: EDocumentType): Promise<string> {
    const year = new Date().getFullYear();
    const seq = await this.counterRepository.getNextSequence(`${type}_${year}`);
    const prefix = DOCUMENT_PREFIX[type];

    return `${prefix}${year}${seq.toString().padStart(6, '0')}`;
  }
}
