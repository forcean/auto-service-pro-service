import { ETaskStatus, ETaskType } from '../../task/enums/task.enum';

export interface WorkOrderProgressTask {
  status?: ETaskStatus;
  progress?: number;
  estimateMinute?: number;
  taskType?: ETaskType;
  isRequired?: boolean;
}

export interface WorkOrderProgressResult {
  progress: number;
  totalTasks: number;
  completedTasks: number;
  cancelledTasks: number;
}

/**
 * Calculates work order progress from its non-cancelled tasks.
 * Estimated minutes are used as weights when at least one task has an estimate.
 */
export function calculateWorkOrderProgress(
  tasks: WorkOrderProgressTask[],
): WorkOrderProgressResult {
  // Legacy tasks have no taskType/isRequired; treat them as required execution
  // tasks so existing work orders retain their previous behaviour.
  const executionTasks = tasks.filter(
    (task) => task.taskType !== ETaskType.GROUP && task.isRequired !== false,
  );
  const cancelledTasks = executionTasks.filter(
    (task) => task.status === ETaskStatus.CANCELLED,
  ).length;
  const activeTasks = executionTasks.filter(
    (task) => task.status !== ETaskStatus.CANCELLED,
  );
  const completedTasks = activeTasks.filter(
    (task) => task.status === ETaskStatus.FINISHED,
  ).length;

  if (!activeTasks.length) {
    return {
      progress: 0,
      totalTasks: executionTasks.length,
      completedTasks,
      cancelledTasks,
    };
  }

  const hasEstimate = activeTasks.some((task) => {
    return getEstimateMinute(task) > 0;
  });

  let progress: number;

  if (hasEstimate) {
    progress = calculateWeightedProgress(activeTasks);
  } else {
    progress = calculateAverageProgress(activeTasks);
  }

  return {
    progress: Math.round(progress * 100) / 100,
    totalTasks: executionTasks.length,
    completedTasks,
    cancelledTasks,
  };
}

function getEstimateMinute(task: WorkOrderProgressTask): number {
  const estimateMinute = Number(task.estimateMinute);

  if (Number.isNaN(estimateMinute) || estimateMinute < 0) {
    return 0;
  }

  return estimateMinute;
}

function getTaskProgress(task: WorkOrderProgressTask): number {
  const progress = Number(task.progress);

  if (Number.isNaN(progress) || progress < 0) {
    return 0;
  }

  if (progress > 100) {
    return 100;
  }

  return progress;
}

function calculateWeightedProgress(tasks: WorkOrderProgressTask[]): number {
  let weightedProgressTotal = 0;
  let estimateTotal = 0;

  for (const task of tasks) {
    const estimateMinute = getEstimateMinute(task);
    weightedProgressTotal += getTaskProgress(task) * estimateMinute;
    estimateTotal += estimateMinute;
  }

  if (estimateTotal === 0) {
    return 0;
  }

  return weightedProgressTotal / estimateTotal;
}

function calculateAverageProgress(tasks: WorkOrderProgressTask[]): number {
  let progressTotal = 0;

  for (const task of tasks) {
    progressTotal += getTaskProgress(task);
  }

  return progressTotal / tasks.length;
}
