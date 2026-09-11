/// <reference types="jest" />

import { ETaskStatus } from '../../task/enums/task.enum';
import { calculateWorkOrderProgress } from './work-order-progress.util';

describe('calculateWorkOrderProgress', () => {
  it('calculates weighted progress and ignores cancelled tasks', () => {
    expect(
      calculateWorkOrderProgress([
        { status: ETaskStatus.IN_PROGRESS, progress: 50, estimateMinute: 30 },
        { status: ETaskStatus.FINISHED, progress: 100, estimateMinute: 60 },
        { status: ETaskStatus.CANCELLED, progress: 100, estimateMinute: 90 },
      ]),
    ).toEqual({
      progress: 83.33,
      totalTasks: 3,
      completedTasks: 1,
      cancelledTasks: 1,
    });
  });

  it('uses an unweighted average when tasks have no estimate', () => {
    expect(
      calculateWorkOrderProgress([
        { status: ETaskStatus.WAITING, progress: 20 },
        { status: ETaskStatus.IN_PROGRESS, progress: 40 },
      ]).progress,
    ).toBe(30);
  });

  it('returns zero when there are no active tasks', () => {
    expect(
      calculateWorkOrderProgress([
        { status: ETaskStatus.CANCELLED, progress: 100 },
      ]).progress,
    ).toBe(0);
  });
});
