/**
 * `z.enum` requires a non-empty tuple type, but our label maps are iterated via
 * `Object.keys`/`.filter`, which TypeScript always widens to `string[]`. The
 * label maps back these arrays and are never empty, so the runtime check here
 * stands in for the tuple type the compiler can't infer.
 */
export function asZodEnumValues<T extends string>(values: T[]): [T, ...T[]] {
  const [first, ...rest] = values;
  if (first === undefined) throw new Error("expected a non-empty array of enum values");
  return [first, ...rest];
}
