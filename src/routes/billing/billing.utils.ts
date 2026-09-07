export function calculateLaborFactor(
  tasks: Array<{ estimateMinute?: number; actualMinute?: number }>,
) {
  const estimated = tasks.reduce(
    (sum, task) => sum + Number(task.estimateMinute ?? 0),
    0,
  );
  const actual = tasks.reduce(
    (sum, task) => sum + Number(task.actualMinute ?? 0),
    0,
  );
  return estimated > 0 && actual > 0 ? actual / estimated : 1;
}

export function calculateLineAmount(
  quantity: number,
  unitPrice: number,
  discountAmount = 0,
) {
  const gross = quantity * unitPrice;
  if (discountAmount < 0 || discountAmount > gross) {
    throw new Error('Line discount cannot exceed gross amount');
  }
  return Number((gross - discountAmount).toFixed(2));
}
