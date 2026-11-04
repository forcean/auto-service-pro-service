import { Inject, Injectable } from '@nestjs/common';

import { EUserRole } from 'src/common/dto/roles.enum';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { DailyClosingRepository } from 'src/repository/daily-closing/daily-closing.repository';
import { OperationsRepository } from 'src/repository/operations/operations.repository';
import { AuthUser } from 'src/types/user.type';
import { CloseDailyDto } from './dtos/operations.dto';

@Injectable()
export class OperationsService {
  constructor(
    @Inject(OperationsRepository)
    private readonly operationsRepository: OperationsRepository,
    @Inject(DailyClosingRepository)
    private readonly dailyClosingRepository: DailyClosingRepository,
  ) {}

  async getDailyReport(date: string) {
    const range = this.getBangkokRange(date);
    const [report, closing] = await Promise.all([
      this.operationsRepository.getDailyReport(range.from, range.to),
      this.dailyClosingRepository.findByBusinessDate(date),
    ]);
    return { businessDate: date, ...report, closing: closing ?? null };
  }

  async closeDaily(dto: CloseDailyDto, user: AuthUser) {
    this.ensureManager(user);
    const existing = await this.dailyClosingRepository.findByBusinessDate(dto.date);
    if (existing) {
      throw new BusinessException('4090', 'This business date has already been closed');
    }

    const range = this.getBangkokRange(dto.date);
    const report = await this.operationsRepository.getDailyReport(range.from, range.to);
    const expectedCash = dto.openingCash + report.cashDrawer.cashPayments - report.cashDrawer.cashRefunds;
    const closing = await this.dailyClosingRepository.create({
      businessDate: dto.date,
      openingCash: dto.openingCash,
      cashPayments: report.cashDrawer.cashPayments,
      cashRefunds: report.cashDrawer.cashRefunds,
      expectedCash,
      declaredCash: dto.declaredCash,
      variance: dto.declaredCash - expectedCash,
      unclassifiedRefunds: report.cashDrawer.unclassifiedRefunds,
      note: dto.note?.trim() || undefined,
    }, user);
    return { closing, unclassifiedRefunds: report.cashDrawer.unclassifiedRefunds };
  }

  ensureManager(user: AuthUser) {
    if (![EUserRole.SystemOwner, EUserRole.Admin, EUserRole.Manager, EUserRole.Accountant].includes(user.role as EUserRole)) {
      throw new BusinessException('4030', 'Manager or accountant access is required');
    }
  }

  private getBangkokRange(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BusinessException('4001', 'Date must be YYYY-MM-DD');
    }
    const from = new Date(`${date}T00:00:00.000+07:00`);
    if (Number.isNaN(from.getTime())) throw new BusinessException('4001', 'Invalid business date');
    const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
    return { from, to };
  }
}
