/** Backend authorization metadata identifies delegation even when an operation has no tag. */
export function isDelegatedOperation(operation) {
  return operation["x-edara-authorization"] === "D";
}
