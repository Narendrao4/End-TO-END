type ErrorLike = {
  response?: {
    data?: unknown;
  };
  message?: unknown;
};

function messageFromValue(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map(messageFromValue).filter(Boolean).join(', ') || null;
  }
  if (typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  return (
    messageFromValue(record.error) ||
    messageFromValue(record.message) ||
    messageFromValue(record.details) ||
    messageFromValue(record.code)
  );
}

export function getErrorMessage(error: unknown, fallback: string): string {
  const errorLike = error as ErrorLike;
  return (
    messageFromValue(errorLike?.response?.data) ||
    messageFromValue(errorLike?.message) ||
    fallback
  );
}
