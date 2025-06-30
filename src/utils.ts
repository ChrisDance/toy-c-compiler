export function LOG(obj: unknown, label: string = "Object"): void {
  const formatted = JSON.stringify(obj, null, 2);
  console.log(`\n=== ${label} ===\n${formatted}\n`);
}
