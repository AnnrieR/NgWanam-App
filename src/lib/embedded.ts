/**
 * PostgREST returns a plain object for a to-one relation and an array for a
 * to-many one, and which is which depends on whether the foreign key target
 * is unique. Pages that embed related rows therefore normalize through this
 * instead of each guessing for themselves.
 */
export function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}
