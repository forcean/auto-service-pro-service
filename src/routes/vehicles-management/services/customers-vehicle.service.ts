import { Inject, Injectable } from '@nestjs/common';
import {
  customerVehicleDto,
  getVehiclesWithPaginationDto,
  updateCustomerVehicleDto,
} from '../dtos/vehicles.dto';
import { AuthUser } from 'src/types/user.type';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { CustomersVehicleRepository } from 'src/repository/customers-vehicle/customers-vehicle.repository';
import { ICustomerVehicle } from '../interfaces/vehicles.interface';
import { getPagination } from 'src/common/utils/pagination.util';
import { SortCriterial } from 'src/common/pipes/parse-sort.pipe';
import { PaginationQuery } from 'src/common/dto/pagination.dto';
import { WorkOrderRepository } from 'src/repository/work-order/work-order.repository';
import { ServiceHistoryRepository } from 'src/repository/service-history/service-history.repository';
import { VehicleDocumentRepository } from 'src/repository/vehicle-document/vehicle-document.repository';
import { createVehicleDocumentDto } from '../dtos/vehicles.dto';
import { EWorkOrderStatus } from 'src/routes/work-order/enums/work-order.enum';
import { Types } from 'mongoose';
import { CustomerRepository } from 'src/repository/customer/customer.repository';

@Injectable()
export class CustomersVehicleService {
  constructor(
    @Inject(CustomersVehicleRepository)
    private readonly customersVehicleRepository: CustomersVehicleRepository,
    @Inject(WorkOrderRepository)
    private readonly workOrderRepository: WorkOrderRepository,
    @Inject(ServiceHistoryRepository)
    private readonly serviceHistoryRepository: ServiceHistoryRepository,
    @Inject(VehicleDocumentRepository)
    private readonly vehicleDocumentRepository: VehicleDocumentRepository,
    @Inject(CustomerRepository)
    private readonly customerRepository: CustomerRepository,
  ) {}
  async createCustomersVehicle(dto: customerVehicleDto, user: AuthUser) {
    try {
      this.userRoleValidation(user.role);

      const existingVehicle =
        await this.customersVehicleRepository.getVehicleByLicensePlate(
          dto.licensePlate,
          dto.province,
        );

      if (existingVehicle) {
        throw new BusinessException('4090', 'This vehicle already exists');
      }

      const customer = await this.customerRepository.resolveForVehicle(dto, user);
      const result = await this.customersVehicleRepository.createCustomerVehicle(
        {
          ...dto,
          ...this.customerRepository.vehicleSnapshot(customer),
        },
        user.publicId,
      );

      if (!result) {
        throw new BusinessException('4011', 'Failed to create vehicle');
      }
    } catch (error) {
      console.error(
        `Error creating product vehicles: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getCustomerVehicleByLicensePlate(
    licensePlate: string,
    province: string,
  ): Promise<ICustomerVehicle> {
    try {
      const getVehicle =
        await this.customersVehicleRepository.getVehicleByLicensePlate(
          licensePlate,
          province,
        );

      if (!getVehicle) {
        throw new BusinessException('4041', 'No vehicles found');
      }

      return getVehicle;
    } catch (error) {
      console.error(
        `Error getting customer vehicle: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async updateCustomerVehicleByLicensePlate(
    user: AuthUser,
    dto: updateCustomerVehicleDto,
    licensePlate: string,
    province: string,
  ): Promise<ICustomerVehicle | null> {
    try {
      this.userRoleValidation(user.role);

      const existingVehicle =
        await this.customersVehicleRepository.getVehicleByLicensePlate(
          licensePlate,
          province,
        );

      if (!existingVehicle) {
        throw new BusinessException('4041', 'No vehicles found');
      }

      const customer = await this.customerRepository.resolveForVehicle(dto, user, existingVehicle);
      const updatedVehicle = await this.customersVehicleRepository.updateCustomerVehicleByLicensePlate(
        licensePlate,
        province,
        {
          ...dto,
          ...this.customerRepository.vehicleSnapshot(customer),
        },
        user.publicId,
      );

      if (!updatedVehicle) {
        throw new BusinessException('4011', 'Failed to update vehicle');
      }

      return updatedVehicle;
    } catch (error) {
      console.error(
        `Error getting customer vehicle: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async deleteCustomerVehicleByLicensePlate(
    user: AuthUser,
    licensePlate: string,
    province: string,
  ): Promise<void> {
    try {
      this.userRoleValidation(user.role);

      const existingVehicle =
        await this.customersVehicleRepository.getVehicleByLicensePlate(
          licensePlate,
          province,
        );

      if (!existingVehicle) {
        throw new BusinessException('4041', 'No vehicles found');
      }

      const deletedVehicle =
        await this.customersVehicleRepository.deleteCustomerVehicleByLicensePlate(
          licensePlate,
          province,
        );

      if (!deletedVehicle) {
        throw new BusinessException('4011', 'Failed to delete vehicle');
      }
    } catch (error) {
      console.error(
        `Error getting customer vehicle: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getVehiclesWithPagination(
    query: getVehiclesWithPaginationDto,
    sortBy: SortCriterial,
  ) {
    try {
      const { page, limit, skip } = getPagination(query);
      const result = await this.customersVehicleRepository.findAllWithPaginated(
        { page, limit, skip },
        query,
        sortBy,
      );

      return result;
    } catch (error) {
      console.error(
        `Error getting customer vehicle: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getVehicleDashboardSummary() {
    return this.customersVehicleRepository.getDashboardSummary();
  }

  async getVehicleOverview(licensePlate: string, province: string) {
    const { vehicleId } = await this.getVehicleContext(licensePlate, province);
    const [workOrders, serviceHistories] = await Promise.all([
      this.workOrderRepository.findByVehicleId(vehicleId),
      this.serviceHistoryRepository.findByVehicleId(vehicleId),
    ]);

    const histories = serviceHistories as any[];
    const orders = workOrders as any[];
    const latestHistory = histories[0];
    const latestWorkOrder = orders[0];
    const activeWorkOrder = orders.find(
      (order) =>
        order.status !== EWorkOrderStatus.COMPLETED &&
        order.status !== EWorkOrderStatus.CANCELLED,
    );

    return {
      kpi: {
        totalVisits: histories.length,
        totalSpend: histories.reduce(
          (total, item) => total + Number(item.totalAmount || 0),
          0,
        ),
        lastVisitDate: latestHistory?.createdAt?.toISOString?.() ?? null,
        openWorkOrdersCount: orders.filter(
          (order) =>
            order.status !== EWorkOrderStatus.COMPLETED &&
            order.status !== EWorkOrderStatus.CANCELLED,
        ).length,
      },
      healthDiagnostics: (latestWorkOrder?.inspections ?? []).map(
        (inspection: any) => ({
          id: String(inspection._id ?? inspection.item),
          name: inspection.item,
          status:
            inspection.status === 'BAD'
              ? 'REPLACE'
              : inspection.status === 'WARNING'
                ? 'DUE_SOON'
                : 'GOOD',
          note: inspection.remark,
          lastCheckedDate:
            latestWorkOrder?.checkInDate?.toISOString?.() ??
            latestWorkOrder?.createdAt?.toISOString?.(),
        }),
      ),
      activeWorkOrder: activeWorkOrder
        ? {
            id: String(activeWorkOrder._id),
            workOrderNo: activeWorkOrder.workOrderNo,
            title: this.getWorkOrderTitle(activeWorkOrder),
            status: this.getOverviewWorkOrderStatus(activeWorkOrder.status),
            createdDate:
              activeWorkOrder.checkInDate?.toISOString?.() ??
              activeWorkOrder.createdAt?.toISOString?.(),
          }
        : null,
      recentActivities: histories.slice(0, 5).map((history) => ({
        id: String(history._id),
        date: history.createdAt?.toISOString?.() ?? '',
        description:
          history.items?.map((item: any) => item.description).filter(Boolean).join(', ') ||
          `งานบริการ ${history.workOrderNo}`,
        byUser: this.getAdvisorName(history.workOrderId?.advisorId),
      })),
      // An invoice read model is not available in this module yet, therefore
      // leave it empty instead of manufacturing an invoice number or amount.
      recentInvoice: null,
      servicePlan: null,
      internalNote: latestWorkOrder?.internalRemark ?? null,
    };
  }

  async getVehicleServiceHistory(licensePlate: string, province: string) {
    const { vehicleId } = await this.getVehicleContext(licensePlate, province);
    const histories = (await this.serviceHistoryRepository.findByVehicleId(
      vehicleId,
    )) as any[];

    return {
      page: 1,
      limit: histories.length || 20,
      total: histories.length,
      totalPage: 1,
      history: histories.map((history) => ({
        id: String(history._id),
        workOrderNo: history.workOrderNo,
        workOrderId: String(history.workOrderId?._id ?? history.workOrderId),
        date: history.createdAt?.toISOString?.() ?? '',
        mileage: Number(history.mileage || 0),
        service:
          history.items?.map((item: any) => item.description).filter(Boolean).join(', ') ||
          'งานบริการ',
        mechanic: this.getAdvisorName(history.workOrderId?.advisorId),
        status: 'COMPLETED',
        totalAmount: Number(history.totalAmount || 0),
      })),
    };
  }

  async getVehicleWorkOrders(licensePlate: string, province: string) {
    const { vehicleId } = await this.getVehicleContext(licensePlate, province);
    const workOrders = (await this.workOrderRepository.findByVehicleId(
      vehicleId,
    )) as any[];

    return workOrders.map((workOrder) => ({
      id: workOrder.workOrderNo,
      workOrderNo: workOrder.workOrderNo,
      title: this.getWorkOrderTitle(workOrder),
      status: workOrder.status,
      statusText: this.getWorkOrderStatusText(workOrder.status),
      mechanicName: this.getAdvisorName(workOrder.advisorId),
      createdAt:
        workOrder.checkInDate?.toISOString?.() ??
        workOrder.createdAt?.toISOString?.(),
      updatedAt: workOrder.updatedAt?.toISOString?.(),
      progress: this.getWorkOrderProgress(workOrder.status),
    }));
  }

  async getVehicleDocuments(licensePlate: string, province: string) {
    const { vehicleId } = await this.getVehicleContext(licensePlate, province);
    const documents = (await this.vehicleDocumentRepository.findByVehicleId(
      vehicleId,
    )) as any[];

    return documents.map((document) => ({
      id: String(document._id),
      name: document.name,
      category: document.category,
      type: document.extension,
      size: document.size,
      uploadedAt: document.createdAt?.toISOString?.() ?? '',
      description: document.description,
      uploadedBy: document.uploadedBy,
    }));
  }

  async createVehicleDocument(
    licensePlate: string,
    province: string,
    dto: createVehicleDocumentDto,
    user: AuthUser,
  ) {
    this.userRoleValidation(user.role);
    const { vehicleId } = await this.getVehicleContext(licensePlate, province);
    const file = this.parseDocumentContent(dto.content, dto.mimeType);

    const createdDocument = await this.vehicleDocumentRepository.create({
      // Persist new records consistently as ObjectId. The repository still
      // reads legacy string-valued vehicleId records created before this fix.
      vehicleId: new Types.ObjectId(vehicleId),
      name: dto.name.trim(),
      category: dto.category,
      extension: dto.extension.toLowerCase().replace(/^\./, ''),
      mimeType: dto.mimeType,
      size: file.size,
      content: dto.content,
      description: dto.description?.trim(),
      uploadedBy: user.publicId,
    });

    return {
      id: String(createdDocument._id),
      name: createdDocument.name,
      category: createdDocument.category,
      type: createdDocument.extension,
      size: createdDocument.size,
      uploadedAt:
        (createdDocument as unknown as { createdAt?: Date }).createdAt?.toISOString?.() ??
        '',
      description: createdDocument.description,
      uploadedBy: createdDocument.uploadedBy,
    };
  }

  async getVehicleDocumentContent(
    licensePlate: string,
    province: string,
    documentId: string,
  ) {
    const { vehicleId } = await this.getVehicleContext(licensePlate, province);
    const document = await this.vehicleDocumentRepository.findContentById(
      vehicleId,
      documentId,
    );

    if (!document) {
      throw new BusinessException('4041', 'Document not found');
    }

    return {
      name: document.name,
      mimeType: document.mimeType,
      content: document.content,
    };
  }

  async deleteVehicleDocument(
    licensePlate: string,
    province: string,
    documentId: string,
    user: AuthUser,
  ) {
    this.userRoleValidation(user.role);
    const { vehicleId } = await this.getVehicleContext(licensePlate, province);
    const document = await this.vehicleDocumentRepository.softDelete(
      vehicleId,
      documentId,
      user.publicId,
    );

    if (!document) {
      throw new BusinessException('4041', 'Document not found');
    }
  }

  private async getVehicleContext(licensePlate: string, province: string) {
    const vehicle = await this.getCustomerVehicleByLicensePlate(
      licensePlate,
      province,
    );
    const vehicleId = String((vehicle as unknown as { _id: unknown })._id);

    if (!vehicleId) {
      throw new BusinessException('4041', 'No vehicles found');
    }

    return { vehicle, vehicleId };
  }

  private parseDocumentContent(content: string, mimeType: string) {
    const matched = /^data:([^;]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(content);
    if (!matched) {
      throw new BusinessException('4000', 'Invalid document content');
    }

    if (mimeType.startsWith('image/')) {
      throw new BusinessException('4000', 'Vehicle photos are not supported');
    }

    const supportedMimeTypes = new Set([
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
    ]);
    if (!supportedMimeTypes.has(mimeType)) {
      throw new BusinessException('4000', 'Unsupported document format');
    }

    const size = Buffer.from(matched[2].replace(/\s/g, ''), 'base64').length;
    if (size > 5 * 1024 * 1024) {
      throw new BusinessException('4000', 'Document must not exceed 5 MB');
    }

    return { size };
  }

  private getWorkOrderTitle(workOrder: any): string {
    return (
      workOrder.complaints?.map((item: any) => item.title).filter(Boolean).join(', ') ||
      workOrder.diagnosis ||
      'ใบสั่งซ่อม'
    );
  }

  private getAdvisorName(advisor: any): string {
    const name = [advisor?.firstname, advisor?.lastname].filter(Boolean).join(' ');
    return name || '-';
  }

  private getWorkOrderProgress(status: EWorkOrderStatus): number {
    const progressByStatus: Partial<Record<EWorkOrderStatus, number>> = {
      [EWorkOrderStatus.OPEN]: 0,
      [EWorkOrderStatus.INSPECTING]: 15,
      [EWorkOrderStatus.WAITING_QUOTATION]: 25,
      [EWorkOrderStatus.WAITING_APPROVAL]: 35,
      [EWorkOrderStatus.WAITING_ASSIGNMENT]: 45,
      [EWorkOrderStatus.IN_PROGRESS]: 60,
      [EWorkOrderStatus.WAITING_QC]: 80,
      [EWorkOrderStatus.REWORK]: 70,
      [EWorkOrderStatus.WAITING_ADDITIONAL_APPROVAL]: 65,
      [EWorkOrderStatus.QC_APPROVED]: 90,
      [EWorkOrderStatus.READY_DELIVERY]: 95,
      [EWorkOrderStatus.COMPLETED]: 100,
      [EWorkOrderStatus.CANCELLED]: 0,
      [EWorkOrderStatus.HOLD]: 50,
    };
    return progressByStatus[status] ?? 0;
  }

  private getWorkOrderStatusText(status: EWorkOrderStatus): string {
    const statusText: Partial<Record<EWorkOrderStatus, string>> = {
      [EWorkOrderStatus.OPEN]: 'เปิดงาน',
      [EWorkOrderStatus.INSPECTING]: 'กำลังตรวจสอบ',
      [EWorkOrderStatus.WAITING_QUOTATION]: 'รอใบเสนอราคา',
      [EWorkOrderStatus.WAITING_APPROVAL]: 'รออนุมัติ',
      [EWorkOrderStatus.WAITING_ASSIGNMENT]: 'รอมอบหมายงาน',
      [EWorkOrderStatus.IN_PROGRESS]: 'กำลังซ่อม',
      [EWorkOrderStatus.WAITING_QC]: 'รอตรวจคุณภาพ',
      [EWorkOrderStatus.REWORK]: 'แก้ไขงาน',
      [EWorkOrderStatus.WAITING_ADDITIONAL_APPROVAL]: 'รออนุมัติเพิ่มเติม',
      [EWorkOrderStatus.QC_APPROVED]: 'QC ผ่าน',
      [EWorkOrderStatus.READY_DELIVERY]: 'พร้อมส่งมอบ',
      [EWorkOrderStatus.COMPLETED]: 'เสร็จสิ้น',
      [EWorkOrderStatus.CANCELLED]: 'ยกเลิก',
      [EWorkOrderStatus.HOLD]: 'พักงาน',
    };
    return statusText[status] ?? status;
  }

  private getOverviewWorkOrderStatus(status: EWorkOrderStatus) {
    if (status === EWorkOrderStatus.COMPLETED) return 'COMPLETED';
    if (status === EWorkOrderStatus.IN_PROGRESS) return 'IN_PROGRESS';
    if (status === EWorkOrderStatus.WAITING_QUOTATION) return 'WAITING_PARTS';
    return 'PENDING';
  }

  private userRoleValidation(role: string) {
    if (role !== 'SO' && role !== 'ADM') {
      throw new BusinessException(
        '4030',
        'Only system owner or admin can use this feature!',
      );
    }
  }
}
