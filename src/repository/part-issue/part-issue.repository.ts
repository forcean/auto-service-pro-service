import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  ClientSession,
  FilterQuery,
  Model,
} from 'mongoose';

import { AuthUser } from 'src/types/user.type';

import {
  PartIssueDocument,
  PartIssueEntity,
} from './part-issue.schema';

import { EPartIssueStatus } from 'src/routes/part-issue/enums/part-issue.enum';

import { GetPartIssueWithPaginationDto } from 'src/routes/part-issue/dtos/part-issue.dto';

import {
  ICreatePartIssueRequest,
  IUpdatePartIssueItemsRequest,
  ICancelPartIssueRequest,
} from 'src/routes/part-issue/interfaces/part-issue.interface';

import { SortCriterial } from 'src/common/pipes/parse-sort.pipe';

@Injectable()
export class PartIssueRepository {
  constructor(
    @InjectModel(PartIssueEntity.name, 'autoservice')
    private readonly partIssueEntity: Model<PartIssueDocument>,
  ) {}

  /**
   * Create
   */
  async createPartIssue(
    payload: ICreatePartIssueRequest,
    user: AuthUser,
    session?: ClientSession,
  ) {
    const [issue] = await this.partIssueEntity.create(
      [
        {
          ...payload,
          createdBy: user.publicId,
          status: EPartIssueStatus.REQUESTED,
        },
      ],
      {
        session,
      },
    );

    return issue;
  }

  /**
   * Get by Issue No
   */
  async getPartIssueByIssueNo(
    issueNo: string,
    session?: ClientSession,
  ) {
    return this.partIssueEntity
      .findOne({
        issueNo,
        isDeleted: false,
      })
      .session(session ?? null);
  }

  /**
   * Get by ID
   */
  async getPartIssueById(
    id: string,
    session?: ClientSession,
  ) {
    return this.partIssueEntity
      .findOne({
        _id: id,
        isDeleted: false,
      })
      .session(session ?? null);
  }

  /**
   * Check exists
   */
  async existsPartIssue(
    issueNo: string,
    session?: ClientSession,
  ) {
    return this.partIssueEntity
      .exists({
        issueNo,
        isDeleted: false,
      })
      .session(session ?? null);
  }

  /**
   * Find by Work Order
   */
  async getPartIssueByWorkOrderNo(
    workOrderNo: string,
    session?: ClientSession,
  ) {
    return this.partIssueEntity
      .find({
        workOrderNo,
        isDeleted: false,
      })
      .sort({
        createdAt: -1,
      })
      .session(session ?? null);
  }

  /**
   * Find by Task
   */
  async getPartIssueByTaskNo(
    taskNo: string,
    session?: ClientSession,
  ) {
    return this.partIssueEntity
      .find({
        taskNo,
        isDeleted: false,
      })
      .sort({
        createdAt: -1,
      })
      .session(session ?? null);
  }

  /**
   * Update items + status
   *
   * ใช้ตอน:
   * - Reserve
   * - Issue
   * - Cancel
   */
  async updateItems(
    issueNo: string,
    payload: IUpdatePartIssueItemsRequest,
    session?: ClientSession,
  ) {
    return this.partIssueEntity.findOneAndUpdate(
      {
        issueNo,
        isDeleted: false,
      },
      {
        $set: {
          items: payload.items,
          status: payload.status,
          updatedBy: payload.updatedBy,
        },
      },
      {
        new: true,
        session,
      },
    );
  }

  /**
   * Cancel
   */
  async cancel(
    issueNo: string,
    payload: ICancelPartIssueRequest,
    session?: ClientSession,
  ) {
    return this.partIssueEntity.findOneAndUpdate(
      {
        issueNo,
        isDeleted: false,
        status: {
          $in: [
            EPartIssueStatus.REQUESTED,
            EPartIssueStatus.PARTIAL,
            EPartIssueStatus.RESERVED,
          ],
        },
      },
      {
        $set: {
          items: payload.items,
          status: EPartIssueStatus.CANCELLED,
          remark: payload.remark,
          updatedBy: payload.updatedBy,
        },
      },
      {
        new: true,
        session,
      },
    );
  }

  /**
   * General update
   */
  async updatePartIssue(
    issueNo: string,
    payload: Partial<PartIssueEntity>,
    user: AuthUser,
    session?: ClientSession,
  ) {
    return this.partIssueEntity.findOneAndUpdate(
      {
        issueNo,
        isDeleted: false,
      },
      {
        ...payload,
        updatedBy: user.publicId,
      },
      {
        new: true,
        session,
      },
    );
  }

  /**
   * Soft Delete
   */
  async softDelete(
    issueNo: string,
    user: AuthUser,
    session?: ClientSession,
  ) {
    return this.partIssueEntity.findOneAndUpdate(
      {
        issueNo,
        isDeleted: false,
      },
      {
        $set: {
          isDeleted: true,
          deletedBy: user.publicId,
          deletedDt: new Date(),
          updatedBy: user.publicId,
        },
      },
      {
        new: true,
        session,
      },
    );
  }

  /**
   * Pagination
   */
  async findAllWithPaginated(
    pagination: {
      page: number;
      limit: number;
      skip: number;
    },
    query: GetPartIssueWithPaginationDto,
    sortBy: SortCriterial,
  ) {
    const { page, limit, skip } = pagination;

    const filter: FilterQuery<PartIssueEntity> = {
      isDeleted: false,
    };

    if (query.issueNo) {
      filter.issueNo = query.issueNo;
    }

    if (query.workOrderNo) {
      filter.workOrderNo = query.workOrderNo;
    }

    if (query.taskNo) {
      filter.taskNo = query.taskNo;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.reason) {
      filter.reason = query.reason;
    }

    if (query.sku) {
      filter['items.sku'] = query.sku;
    }

    const [data, total] = await Promise.all([
      this.partIssueEntity
        .find(filter)
        .sort(sortBy)
        .skip(skip)
        .limit(limit)
        .lean(),

      this.partIssueEntity.countDocuments(filter),
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data,
    };
  }
}