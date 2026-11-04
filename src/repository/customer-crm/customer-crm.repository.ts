import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { CustomerRepository } from 'src/repository/customer/customer.repository';
import { ServiceHistoryEntity } from 'src/repository/service-history/service-history.schema';
import { WorkOrderEntity } from 'src/repository/work-order/work-order.schema';
import { InvoiceEntity } from 'src/repository/invoice/invoice.schema';

type CustomerListQuery = { page: number; limit: number; search?: string };

/** CRM reads the canonical customer profile; vehicles retain a synced snapshot only. */
@Injectable()
export class CustomerCrmRepository {
  constructor(
    private readonly customerRepository: CustomerRepository,
    @InjectModel(ServiceHistoryEntity.name, 'autoservice')
    private readonly historyModel: Model<ServiceHistoryEntity>,
    @InjectModel(WorkOrderEntity.name, 'autoservice')
    private readonly workOrderModel: Model<WorkOrderEntity>,
    @InjectModel(InvoiceEntity.name, 'autoservice')
    private readonly invoiceModel: Model<InvoiceEntity>,
  ) {}

  findCustomers(query: CustomerListQuery) {
    return this.customerRepository.findForVehicle(query);
  }

  async findCustomerDetail(customerId: string) {
    await this.customerRepository.ensureLegacyBackfill();
    const customer = await this.customerRepository.findById(customerId);
    if (!customer) return null;

    const vehiclesResult = await this.customerRepository.findForVehicle({
      page: 1,
      limit: 1,
      search: customer.phoneNumber,
    });
    const vehicles = vehiclesResult.data.find((item: any) => item.id === customerId)?.vehicles ?? [];
    const vehicleIds = vehicles.map((vehicle: any) => new Types.ObjectId(vehicle.id));
    const [histories, workOrders] = await Promise.all([
      this.historyModel.find({ vehicleId: { $in: vehicleIds }, isDeleted: false }).sort({ createdAt: -1 }).lean(),
      this.workOrderModel.find({ vehicleId: { $in: vehicleIds }, isDeleted: false }).sort({ checkInDate: -1 }).lean(),
    ]);
    const workOrderIds = workOrders.map((workOrder) => workOrder._id as Types.ObjectId);
    const invoices = workOrderIds.length
      ? await this.invoiceModel.find({ workOrderId: { $in: workOrderIds }, isDeleted: false }).sort({ createdAt: -1 }).lean()
      : [];
    const invoiceByWorkOrder = new Map(invoices.map((invoice) => [String(invoice.workOrderId), invoice]));
    const totalSpent = invoices.reduce((sum, invoice) => sum + (invoice.paidAmount ?? 0), 0);
    const lastVisitDate = (histories[0] as { createdAt?: Date } | undefined)?.createdAt ?? workOrders[0]?.checkInDate;

    return {
      customer: this.customerRepository.toResponse(customer),
      kpis: {
        vehicleCount: vehicles.length,
        totalVisits: histories.length,
        totalSpent,
        openWorkOrders: workOrders.filter((workOrder) => !['COMPLETED', 'CANCELLED'].includes(String(workOrder.status))).length,
        lastVisitDate,
      },
      vehicles,
      serviceHistory: histories,
      workOrders: workOrders.map((workOrder) => ({
        ...workOrder,
        invoice: invoiceByWorkOrder.get(String(workOrder._id)) ?? null,
      })),
    };
  }
}
