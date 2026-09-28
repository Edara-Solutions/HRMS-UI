interface FieldProps {
  label: string;
  value: string;
}
export function Field({ label, value }: FieldProps) {
  return (
    <div>
      <dt className="text-[var(--color-text-muted)]">{label}</dt>
      <dd className="mt-1 break-words">{value}</dd>
    </div>
  );
}
