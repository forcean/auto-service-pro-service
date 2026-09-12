import {
  EAdditionalProblemStatus,
  ETaskPriority,
  ETaskStatus,
} from '../enums/task.enum';

export interface IAdditionalProblem {
  _id: string;
  description: string;
  createdBy: string;
  status: EAdditionalProblemStatus;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface ICreateTaskRequest {
  workOrderNo: string;
  taskNo: string;
  title: string;
  description?: string;
  priority?: ETaskPriority;
  status?: ETaskStatus;
  estimateMinute?: number;
  actualMinute?: number;
  plannedStartDate?: Date;
  plannedFinishDate?: Date;
  mechanics: IMechanicsItems[];
  remark?: string;
  isRework?: boolean;
}

export interface IMechanicsItems {
  mechanicId: string;
  mechanicName?: string;
}

export interface IUpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: ETaskPriority;
  status?: ETaskStatus;
  estimateMinute?: number;
  actualMinute?: number;
  plannedStartDate?: Date;
  plannedFinishDate?: Date;
  startAt?: Date;
  finishedAt?: Date;
  pausedAt?: Date;
  progress?: number;
  mechanics?: IMechanicsItems[];
  remark?: string;
}
