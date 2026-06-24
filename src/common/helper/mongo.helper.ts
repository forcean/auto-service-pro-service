export function mapMongoId<
  T extends {
    _id: any;
    __v?: number;
  },
>(
  doc: T,
): Omit<T, '_id' | '__v'> & {
  id: string;
} {
  const { _id, __v, ...rest } = doc;

  return {
    id: _id.toString(),
    ...rest,
  };
}

export function mapMongoIds<
  T extends {
    _id: any;
    __v?: number;
  },
>(
  docs: T[],
): (Omit<T, '_id' | '__v'> & {
  id: string;
})[] {
  return docs.map(mapMongoId);
}
