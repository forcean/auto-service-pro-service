import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { BusinessException } from 'src/common/exceptions/business.exception';
import { AuthUser } from 'src/types/user.type';
import { CustomersVehicleEntity } from 'src/repository/customers-vehicle/customers-vehicle.schema';
import { CustomerDocument, CustomerEntity } from './customer.schema';

export type CustomerPayload = {
  firstname: string;
  lastname: string;
  phoneNumber: string;
  billingName?: string;
  taxId?: string;
  billingAddress?: string;
  branchNo?: string;
};

type CustomerListQuery = { page: number; limit: number; search?: string };

@Injectable()
export class CustomerRepository {
  constructor(
    @InjectModel(CustomerEntity.name, 'autoservice')
    private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(CustomersVehicleEntity.name, 'autoservice')
    private readonly vehicleModel: Model<CustomersVehicleEntity>,
  ) {}

  /** Idempotently adopts pre-master records. Safe to call before Phase 1 reads. */
  async ensureLegacyBackfill() {
    const legacyVehicles = await this.vehicleModel.find({
      $or: [{ customerId: { $exists: false } }, { customerId: null }],
    }).lean();
    if (!legacyVehicles.length) return;

    const byPhone = new Map<string, any[]>();
    for (const vehicle of legacyVehicles) {
      const normalized = this.normalizePhone(vehicle.phoneNumber);
      if (!normalized) continue;
      const group = byPhone.get(normalized) ?? [];
      group.push(vehicle);
      byPhone.set(normalized, group);
    }

    for (const [phoneNumberNormalized, vehicles] of byPhone) {
      const first = vehicles[0];
      const names = new Set(
        vehicles.map((vehicle) => `${this.clean(vehicle.firstname)} ${this.clean(vehicle.lastname)}`.trim().toLocaleLowerCase()),
      );
      const customer = await this.customerModel.findOneAndUpdate(
        { phoneNumberNormalized },
        {
          $setOnInsert: {
            ...this.cleanPayload(first),
            phoneNumberNormalized,
            createdBy: first.createdBy ?? 'LEGACY_BACKFILL',
          },
          ...(names.size > 1 ? { $set: { needsReview: true } } : {}),
        },
        { new: true, upsert: true },
      ).lean();
      if (!customer) continue;
      await this.vehicleModel.updateMany(
        { _id: { $in: vehicles.map((vehicle) => vehicle._id) } },
        { $set: this.vehicleSnapshot(customer) },
      );
    }
  }

  async findForVehicle(query: CustomerListQuery) {
    await this.ensureLegacyBackfill();
    const filter = this.buildSearchFilter(query.search);
    const [customers, total] = await Promise.all([
      this.customerModel.find(filter).sort({ updatedAt: -1, firstname: 1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
      this.customerModel.countDocuments(filter),
    ]);
    const ids = customers.map((customer) => customer._id);
    const vehicleRows = ids.length
      ? await this.vehicleModel.aggregate<{
          _id: Types.ObjectId;
          vehicleCount: number;
          vehicles: unknown[];
        }>([
          { $match: { customerId: { $in: ids } } },
          {
            $group: {
              _id: '$customerId',
              vehicleCount: { $sum: 1 },
              vehicles: {
                $push: {
                  id: '$_id', licensePlate: '$licensePlate', province: '$province',
                  brand: '$vehicle.brand', model: '$vehicle.model', mileage: '$mileage',
                },
              },
            },
          },
        ])
      : [];
    const vehicleByCustomer = new Map(vehicleRows.map((row) => [String(row._id), row]));
    return {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
      data: customers.map((customer) => {
        const vehicles = vehicleByCustomer.get(String(customer._id));
        return {
          ...this.toResponse(customer),
          customerName: `${customer.firstname} ${customer.lastname}`.trim(),
          vehicleCount: vehicles?.vehicleCount ?? 0,
          vehicles: vehicles?.vehicles ?? [],
          lastRegisteredAt: (customer as { updatedAt?: Date }).updatedAt,
        };
      }),
    };
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.customerModel.findById(id).lean();
  }

  async create(payload: CustomerPayload, user: AuthUser) {
    const prepared = this.cleanPayload(payload);
    const normalized = this.normalizePhone(prepared.phoneNumber);
    const existing = await this.customerModel.findOne({ phoneNumberNormalized: normalized }).lean();
    if (existing) {
      throw new BusinessException('4090', 'A customer with this phone number already exists');
    }
    const customer = await this.customerModel.create({
      ...prepared,
      phoneNumberNormalized: normalized,
      createdBy: user.publicId,
    });
    return customer.toObject();
  }

  async update(id: string, payload: Partial<CustomerPayload>, user: AuthUser) {
    const existing = await this.findById(id);
    if (!existing) throw new BusinessException('4040', 'Customer not found');
    const prepared = this.cleanPayload({ ...existing, ...payload });
    const phoneNumberNormalized = this.normalizePhone(prepared.phoneNumber);
    const conflict = await this.customerModel.findOne({
      phoneNumberNormalized,
      _id: { $ne: existing._id },
    }).lean();
    if (conflict) throw new BusinessException('4090', 'A customer with this phone number already exists');

    const customer = await this.customerModel.findByIdAndUpdate(
      id,
      { $set: { ...prepared, phoneNumberNormalized, updatedBy: user.publicId, needsReview: false } },
      { new: true },
    ).lean();
    if (!customer) throw new BusinessException('5003', 'Failed to update customer');
    await this.vehicleModel.updateMany({ customerId: customer._id }, { $set: this.vehicleSnapshot(customer) });
    return customer;
  }

  async resolveForVehicle(
    payload: Partial<CustomerPayload> & { customerId?: string },
    user: AuthUser,
    currentVehicle?: any,
  ) {
    if (payload.customerId) {
      const selected = await this.findById(payload.customerId);
      if (!selected) throw new BusinessException('4040', 'Selected customer not found');
      return selected;
    }
    if (currentVehicle?.customerId) {
      const current = await this.findById(String(currentVehicle.customerId));
      if (current) return current;
    }

    const phoneNumber = payload.phoneNumber ?? currentVehicle?.phoneNumber;
    const firstname = payload.firstname ?? currentVehicle?.firstname;
    const lastname = payload.lastname ?? currentVehicle?.lastname;
    if (!phoneNumber || !firstname || !lastname) {
      throw new BusinessException('4001', 'Select an existing customer or provide a complete new customer profile');
    }
    const normalized = this.normalizePhone(phoneNumber);
    const existing = await this.customerModel.findOne({ phoneNumberNormalized: normalized }).lean();
    if (existing) {
      if (!this.sameName(existing, firstname, lastname)) {
        throw new BusinessException('4090', 'This phone number belongs to an existing customer. Select that profile instead.');
      }
      return existing;
    }
    return this.create({
      firstname,
      lastname,
      phoneNumber,
      billingName: payload.billingName ?? currentVehicle?.billingName,
      taxId: payload.taxId ?? currentVehicle?.taxId,
      billingAddress: payload.billingAddress ?? currentVehicle?.billingAddress,
      branchNo: payload.branchNo ?? currentVehicle?.branchNo,
    }, user);
  }

  vehicleSnapshot(customer: any) {
    return {
      customerId: customer._id,
      firstname: customer.firstname,
      lastname: customer.lastname,
      phoneNumber: customer.phoneNumber,
      billingName: customer.billingName,
      taxId: customer.taxId,
      billingAddress: customer.billingAddress,
      branchNo: customer.branchNo,
    };
  }

  toResponse(customer: any) {
    const { _id, ...rest } = customer;
    return { ...rest, id: String(_id), customerName: `${customer.firstname} ${customer.lastname}`.trim() };
  }

  private buildSearchFilter(search?: string) {
    const value = search?.trim();
    if (!value) return {};
    const pattern = new RegExp(this.escapeRegex(value), 'i');
    const normalized = this.normalizePhone(value);
    return {
      $or: [
        { firstname: pattern }, { lastname: pattern }, { billingName: pattern },
        { phoneNumber: pattern }, ...(normalized ? [{ phoneNumberNormalized: { $regex: normalized } }] : []),
      ],
    };
  }

  private cleanPayload(payload: Partial<CustomerPayload>) {
    return {
      firstname: this.clean(payload.firstname),
      lastname: this.clean(payload.lastname),
      phoneNumber: this.clean(payload.phoneNumber),
      billingName: this.optional(payload.billingName),
      taxId: this.optional(payload.taxId),
      billingAddress: this.optional(payload.billingAddress),
      branchNo: this.optional(payload.branchNo),
    };
  }

  private sameName(customer: any, firstname: string, lastname: string) {
    return this.clean(customer.firstname).toLocaleLowerCase() === this.clean(firstname).toLocaleLowerCase()
      && this.clean(customer.lastname).toLocaleLowerCase() === this.clean(lastname).toLocaleLowerCase();
  }

  private normalizePhone(value?: string) { return this.clean(value).replace(/\D/g, ''); }
  private clean(value?: string) { return (value ?? '').trim().replace(/\s+/g, ' '); }
  private optional(value?: string) { return this.clean(value) || undefined; }
  private escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
}
