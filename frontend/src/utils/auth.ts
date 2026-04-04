interface TokenPayload {
  sub: string;
  username: string;
  role: string;
  exp: number;
}

export function getTokenPayload(): TokenPayload | null {
  const token = localStorage.getItem('access_token');
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split('.')[1])) as TokenPayload;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  const payload = getTokenPayload();
  if (!payload) return false;
  if (Date.now() / 1000 > payload.exp) {
    localStorage.removeItem('access_token');
    return false;
  }
  return true;
}

export function isAdmin(): boolean {
  return getTokenPayload()?.role === 'admin';
}

export function getUsername(): string {
  return getTokenPayload()?.username ?? '';
}

export function logout(): void {
  localStorage.removeItem('access_token');
}
