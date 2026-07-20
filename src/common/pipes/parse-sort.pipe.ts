import { PipeTransform } from '@nestjs/common';

//
export type SortOrder = 'asc' | 'desc';

export interface SortCriterial {
  [key: string]: SortOrder;
}

export function validateSortPattern(pattern: string) {
  const regex = /^(\w+\.(asc|desc))(,\w+\.(asc|desc))*$/;

  return regex.test(pattern);
}

export function parseSortString(sortString: string): SortCriterial {
  if (typeof sortString === 'object') return sortString;
  const criteria: SortCriterial = {};
  const parts = sortString.split(',');

  parts.forEach((part) => {
    const [key, order] = part.split('.');
    criteria[key] = order as SortOrder;
  });

  return criteria;
}

// TODO: Refactor
export class ParseSortPipe implements PipeTransform {
  transform(value: string): SortCriterial | null {
    if (value === '' || value === null || value === undefined) return null;
    if (!validateSortPattern(value)) {
      throw Error;
    }
    return parseSortString(value);
  }

}
