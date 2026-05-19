import { v4 as uuidv4 } from 'uuid';

export function generateId(): string {
  return uuidv4();
}

export function isValidUuid(value: string): boolean {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return UUID_REGEX.test(value);
}
