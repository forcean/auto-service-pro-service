export enum ETaskStatus {
  WAITING = 'WAITING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  QUALITY_CHECK = 'QUALITY_CHECK',
  PAUSED = 'PAUSED',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
}

export enum ETaskPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

/**
 * GROUP is a planning/container task. Only EXECUTION and REWORK tasks are
 * included in a work order's operational progress and QC completion check.
 */
export enum ETaskType {
  GROUP = 'GROUP',
  EXECUTION = 'EXECUTION',
  REWORK = 'REWORK',
}

export enum ETaskBlockedReason {
  WAITING_PARTS = 'WAITING_PARTS',
  WAITING_APPROVAL = 'WAITING_APPROVAL',
  WAITING_CUSTOMER = 'WAITING_CUSTOMER',
  OTHER = 'OTHER',
}

export enum EAdditionalProblemStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}
