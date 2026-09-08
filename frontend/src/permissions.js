export const normalizeRole = (role) => String(role || '').trim().toUpperCase();

export const isOwner = (role) => normalizeRole(role) === 'OWNER';

export const canManageInventory = (role) => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === 'INVENTORY' || normalizedRole === 'OWNER';
};
