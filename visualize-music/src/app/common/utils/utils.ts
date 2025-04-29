export function craftKey(entityType: string, key: string): string {
  return `${entityType}::${key}`;
}
