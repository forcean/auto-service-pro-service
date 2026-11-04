import { CustomerRepository } from './customer.repository';

describe('CustomerRepository', () => {
  const user = {
    id: '1', publicId: 'u-1', email: 'u@example.com', firstname: 'User', lastname: 'One',
    role: 'ADM', activeFlag: true, permissions: [],
  };

  it('refuses a new spelling for an existing phone until the profile is selected', async () => {
    const customerModel = {
      findOne: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439011', firstname: 'สมชาย', lastname: 'ใจดี', phoneNumber: '0812345678', phoneNumberNormalized: '0812345678',
        }),
      }),
    };
    const repository = new CustomerRepository(customerModel as any, {} as any);

    await expect(repository.resolveForVehicle({
      firstname: 'สมชาย', lastname: 'ใจดีมาก', phoneNumber: '0812345678',
    }, user)).rejects.toMatchObject({ resultCode: '4090' });
  });
});
