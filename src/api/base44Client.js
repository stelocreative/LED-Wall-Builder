const STORAGE_PREFIX = 'led_wall_designer';

const ENTITY_KEYS = {
  Show: `${STORAGE_PREFIX}:shows`,
  Wall: `${STORAGE_PREFIX}:walls`,
  PanelFamily: `${STORAGE_PREFIX}:panel_families`,
  CabinetVariant: `${STORAGE_PREFIX}:cabinet_variants`
};

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readCollection(entityName) {
  if (!canUseStorage()) return [];
  const storageKey = ENTITY_KEYS[entityName];
  if (!storageKey) return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCollection(entityName, items) {
  if (!canUseStorage()) return;
  const storageKey = ENTITY_KEYS[entityName];
  if (!storageKey) return;
  window.localStorage.setItem(storageKey, JSON.stringify(items));
}

function asComparable(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return value;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.getTime();
  return String(value).toLowerCase();
}

function sortItems(items, sortField) {
  if (!sortField) return [...items];
  const descending = String(sortField).startsWith('-');
  const field = descending ? String(sortField).slice(1) : String(sortField);
  return [...items].sort((a, b) => {
    const av = asComparable(a?.[field]);
    const bv = asComparable(b?.[field]);
    if (av < bv) return descending ? 1 : -1;
    if (av > bv) return descending ? -1 : 1;
    return 0;
  });
}

function filterItems(items, where = {}) {
  const entries = Object.entries(where || {});
  if (!entries.length) return [...items];
  return items.filter((item) =>
    entries.every(([key, value]) => String(item?.[key] ?? '') === String(value ?? ''))
  );
}

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function createEntityApi(entityName) {
  return {
    async list(sortField, limit) {
      const all = readCollection(entityName);
      const sorted = sortItems(all, sortField);
      if (typeof limit === 'number') {
        return sorted.slice(0, limit);
      }
      return sorted;
    },
    async filter(where) {
      const all = readCollection(entityName);
      return filterItems(all, where);
    },
    async create(data) {
      const all = readCollection(entityName);
      const record = {
        id: data?.id || generateId(),
        created_date: nowIso(),
        updated_date: nowIso(),
        ...data
      };
      all.push(record);
      writeCollection(entityName, all);
      return record;
    },
    async update(id, data) {
      const all = readCollection(entityName);
      const idx = all.findIndex((item) => String(item?.id) === String(id));
      if (idx < 0) {
        throw new Error(`${entityName} not found`);
      }
      const updated = {
        ...all[idx],
        ...data,
        id: all[idx].id,
        updated_date: nowIso()
      };
      all[idx] = updated;
      writeCollection(entityName, all);
      return updated;
    },
    async delete(id) {
      const all = readCollection(entityName);
      const next = all.filter((item) => String(item?.id) !== String(id));
      writeCollection(entityName, next);
      return { success: true };
    }
  };
}

export const base44 = {
  entities: {
    Show: createEntityApi('Show'),
    Wall: createEntityApi('Wall'),
    PanelFamily: createEntityApi('PanelFamily'),
    CabinetVariant: createEntityApi('CabinetVariant')
  },
  auth: {
    async me() {
      return { id: 'local-user', role: 'admin', email: 'local@starsound.com' };
    },
    logout() {},
    redirectToLogin() {}
  },
  appLogs: {
    async logUserInApp() {
      return true;
    }
  }
};
