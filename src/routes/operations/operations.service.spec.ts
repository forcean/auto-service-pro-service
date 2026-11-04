import { OperationsService } from './operations.service';

describe('OperationsService', () => {
  const manager = {
    id: 'user-id',
    publicId: 'manager-1',
    email: 'manager@example.com',
    firstname: 'Manager',
    lastname: 'One',
    role: 'MNG',
    activeFlag: true,
    permissions: [],
  };

  it('snapshots expected cash from opening float, cash payments, and cash refunds', async () => {
    const operationsRepository = {
      getDailyReport: jest.fn().mockResolvedValue({
        cashDrawer: { cashPayments: 850, cashRefunds: 50, unclassifiedRefunds: 20 },
      }),
    };
    const dailyClosingRepository = {
      findByBusinessDate: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ businessDate: '2026-10-23' }),
    };
    const service = new OperationsService(
      operationsRepository as any,
      dailyClosingRepository as any,
    );

    await service.closeDaily({
      date: '2026-10-23',
      openingCash: 100,
      declaredCash: 875,
      note: 'counted by manager',
    }, manager);

    expect(dailyClosingRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      expectedCash: 900,
      variance: -25,
      cashPayments: 850,
      cashRefunds: 50,
      unclassifiedRefunds: 20,
    }), manager);
  });
});
