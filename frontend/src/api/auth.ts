export function redirectToGoogle() {
  window.location.href = '/api/auth/google';
}

export async function exchangeCode(code: string): Promise<{ access_token: string; role: string }> {
  const res = await fetch('/api/auth/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error('Authorization code exchange failed');
  return res.json();
}
