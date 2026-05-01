const KEY = 'hypoxy_groups';
const DEFAULTS = [1, 2, 3, 4, 5];

export function getGroups(): number[] {
  try {
    const s = localStorage.getItem(KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return DEFAULTS;
}

function save(groups: number[]): number[] {
  localStorage.setItem(KEY, JSON.stringify(groups));
  return groups;
}

export function addGroup(g: number): number[] {
  const current = getGroups();
  if (current.includes(g)) return current;
  return save([...current, g].sort((a, b) => a - b));
}

export function removeGroup(g: number): number[] {
  return save(getGroups().filter((x) => x !== g));
}
