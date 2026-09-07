import { ETaskPriority, ETaskStatus } from '../enums/task.enum';

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
