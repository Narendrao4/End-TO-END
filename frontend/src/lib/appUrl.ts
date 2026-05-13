const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

export function getAppBaseUrl(): string {
  if (envAppUrl) {
    return envAppUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return '';
}

export function buildInviteUrl(code: string): string {
  const base = getAppBaseUrl();
  return base ? `${base}/invite/${code}` : `/invite/${code}`;
}
