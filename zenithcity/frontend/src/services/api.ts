const BASE_URL = '/api';

function getToken(): string | null {
  return localStorage.getItem('zenith_token');
}

async function request(method: string, path: string, body?: any): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: (path: string) => request('GET', path),
  post: (path: string, body: any) => request('POST', path, body),
  put: (path: string, body: any) => request('PUT', path, body),
  delete: (path: string) => request('DELETE', path),
};
