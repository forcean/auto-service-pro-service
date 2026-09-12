import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  EAdditionalProblemStatus,
  ETaskPriority,
  ETaskStatus,
} from 'src/routes/task/enums/task.enum';
import { WorkOrderEntity } from '../work-order/work-order.schema';
import { UsersEntity } from '../users/users.schema';

export type WorkOrderTaskDocument = HydratedDocument<WorkOrderTaskEntity>;

@Schema({ _id: false })
export class MechanicItem {
  @Prop({
    type: Types.ObjectId,
    ref: UsersEntity.name,
    required: true,
  })
  mechanicId?: Types.ObjectId;

  @Prop()
  mechanicName!: string;
}
export const MechanicItemSchema = SchemaFactory.createForClass(MechanicItem);

@Schema({ timestamps: true })
export class AdditionalProblem {
  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ required: true })
  createdBy!: string;

  @Prop({
    enum: EAdditionalProblemStatus,
    default: EAdditionalProblemStatus.PENDING,
  })
  status!: EAdditionalProblemStatus;

  @Prop()
  approvedBy?: string;

  @Prop()
  approvedAt?: Date;

  @Prop()
  rejectedBy?: string;

  @Prop()
  rejectedAt?: Date;

  @Prop()
  rejectedReason?: string;
}
export const AdditionalProblemSchema =
  SchemaFactory.createForClass(AdditionalProblem);

@Schema({
  collection: 'work_order_tasks',
  timestamps: true,
})
export class WorkOrderTaskEntity {
  @Prop({
    ref: WorkOrderEntity.name,
    required: true,
    index: true,
  })
  workOrderNo!: string;

  @Prop({
    required: true,
  })
  taskNo!: string;

  @Prop({
    required: true,
    trim: true,
  })
  title!: string;

  @Prop()
  description?: string;

  @Prop({
    enum: ETaskPriority,
    default: ETaskPriority.NORMAL,
  })
  priority!: ETaskPriority;

  /**
   * WAITING
   * ASSIGNED
   * IN_PROGRESS
   * PAUSED
   * FINISHED
   * CANCELLED
   */
  @Prop({
    enum: ETaskStatus,
    default: ETaskStatus.WAITING,
    index: true,
  })
  status!: ETaskStatus;

  @Prop({
    default: 0,
  })
  estimateMinute!: number;

  @Prop({
    default: 0,
  })
  actualMinute!: number;

  @Prop({
    default: 0,
    min: 0,
    max: 100,
  })
  progress!: number;

  @Prop({
    default: false,
    index: true,
  })
  isRework!: boolean;

  @Prop({
    type: [AdditionalProblemSchema],
    default: [],
  })
  additionalProblems!: AdditionalProblem[];

  @Prop()
  plannedStartDate?: Date;

  @Prop()
  plannedFinishDate?: Date;

  @Prop()
  startedAt?: Date;

  @Prop()
  finishedAt?: Date;

  @Prop({
    type: [MechanicItemSchema],
    default: [],
  })
  mechanics!: MechanicItem[];

  @Prop()
  remark?: string;

  @Prop({
    default: false,
    index: true,
  })
  isDeleted!: boolean;

  @Prop()
  createdBy?: string;

  @Prop()
  createdDt?: string;

  @Prop()
  updatedBy?: string;

  @Prop()
  deletedBy?: string;

  @Prop()
  deletedDt?: Date;
}

export const WorkOrderTaskSchema =
  SchemaFactory.createForClass(WorkOrderTaskEntity);

WorkOrderTaskSchema.index({
  workOrderNo: 1,
  status: 1,
});

WorkOrderTaskSchema.index({
  taskNo: 1,
}, {
  unique: true,
});
