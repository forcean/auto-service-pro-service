import { AppointmentService } from './appointment.service';

describe('AppointmentService', () => {
  const bookedAppointment = {
    _id: '507f1f77bcf86cd799439011',
    customerName: 'สมชาย ใจดี',
    phoneNumber: '0812345678',
    serviceType: 'เปลี่ยนน้ำมันเครื่อง',
    appointmentAt: new Date('2026-10-23T02:00:00.000Z'),
    durationMinutes: 30,
    status: 'BOOKED',
    notificationStatus: 'NOT_NOTIFIED',
    createdBy: 'staff-1',
    updatedBy: 'staff-1',
  };

  const createService = () => {
    const appointmentRepository = {
      findById: jest.fn().mockResolvedValue(bookedAppointment),
      checkIn: jest.fn().mockResolvedValue({
        ...bookedAppointment,
        status: 'CHECKED_IN',
        queueDate: '2026-10-23',
        queueNumber: 7,
      }),
    };
    const counterRepository = {
      getNextSequence: jest.fn().mockResolvedValue(7),
    };
    const service = new AppointmentService(
      appointmentRepository as any,
      counterRepository as any,
    );
    return { service, appointmentRepository, counterRepository };
  };

  it('assigns the next atomic daily queue number when a booked customer checks in', async () => {
    const { service, appointmentRepository, counterRepository } = createService();

    const result = await service.checkIn(
      '507f1f77bcf86cd799439011',
      { publicId: 'staff-1' } as any,
    );

    expect(counterRepository.getNextSequence).toHaveBeenCalledWith(
      expect.stringMatching(/^APPOINTMENT_QUEUE_\d{4}-\d{2}-\d{2}$/),
    );
    expect(appointmentRepository.checkIn).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      7,
      { publicId: 'staff-1' },
    );
    expect(result).toMatchObject({
      id: '507f1f77bcf86cd799439011',
      queueNumber: 7,
      appointmentType: 'VEHICLE_DROPOFF',
    });
  });

  it('does not allocate a queue for a cancelled appointment', async () => {
    const { service, appointmentRepository, counterRepository } = createService();
    appointmentRepository.findById.mockResolvedValue({
      ...bookedAppointment,
      status: 'CANCELLED',
    });

    await expect(
      service.checkIn('507f1f77bcf86cd799439011', { publicId: 'staff-1' } as any),
    ).rejects.toMatchObject({ resultCode: '4001' });

    expect(counterRepository.getNextSequence).not.toHaveBeenCalled();
    expect(appointmentRepository.checkIn).not.toHaveBeenCalled();
  });

  it('does not allocate a queue for a customer vehicle-pickup appointment', async () => {
    const { service, appointmentRepository, counterRepository } = createService();
    appointmentRepository.findById.mockResolvedValue({
      ...bookedAppointment,
      appointmentType: 'VEHICLE_PICKUP',
    });

    await expect(
      service.checkIn('507f1f77bcf86cd799439011', { publicId: 'staff-1' } as any),
    ).rejects.toMatchObject({ resultCode: '4001' });

    expect(counterRepository.getNextSequence).not.toHaveBeenCalled();
    expect(appointmentRepository.checkIn).not.toHaveBeenCalled();
  });
});
