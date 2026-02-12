const FAVORITE_CABINETS_STORAGE_KEY = 'led-wall.favorite-cabinet-ids';
const FAVORITE_CABINETS_EVENT = 'led-wall.favorite-cabinets-updated';

function sanitizeFavoriteIds(ids) {
  if (!Array.isArray(ids)) {
    return [];
  }

  return Array.from(
    new Set(
      ids
        .map((id) => String(id || '').trim())
        .filter(Boolean)
    )
  );
}

export function readFavoriteCabinetIds() {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(FAVORITE_CABINETS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return sanitizeFavoriteIds(parsed);
  } catch {
    return [];
  }
}

export function writeFavoriteCabinetIds(ids) {
  if (typeof window === 'undefined') {
    return [];
  }

  const sanitized = sanitizeFavoriteIds(ids);
  window.localStorage.setItem(FAVORITE_CABINETS_STORAGE_KEY, JSON.stringify(sanitized));
  window.dispatchEvent(new CustomEvent(FAVORITE_CABINETS_EVENT, { detail: sanitized }));
  return sanitized;
}

export function toggleFavoriteCabinetId(cabinetId) {
  const id = String(cabinetId || '').trim();
  if (!id) {
    return readFavoriteCabinetIds();
  }

  const nextIds = new Set(readFavoriteCabinetIds());
  if (nextIds.has(id)) {
    nextIds.delete(id);
  } else {
    nextIds.add(id);
  }

  return writeFavoriteCabinetIds([...nextIds]);
}

export function isCabinetFavorite(cabinetId, favoriteIds = []) {
  if (!cabinetId) {
    return false;
  }
  return new Set(favoriteIds).has(String(cabinetId));
}

export function sortCabinetsByFavorites(cabinets = [], favoriteIds = []) {
  const favoriteSet = new Set((favoriteIds || []).map((id) => String(id)));

  return [...cabinets].sort((a, b) => {
    const aFavRank = favoriteSet.has(String(a?.id)) ? 0 : 1;
    const bFavRank = favoriteSet.has(String(b?.id)) ? 0 : 1;
    if (aFavRank !== bFavRank) {
      return aFavRank - bFavRank;
    }

    const aName = `${a?.variant_name || ''}`.toLowerCase();
    const bName = `${b?.variant_name || ''}`.toLowerCase();
    if (aName !== bName) {
      return aName.localeCompare(bName);
    }

    return String(a?.id || '').localeCompare(String(b?.id || ''));
  });
}

export function subscribeFavoriteCabinetIds(callback) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = () => callback(readFavoriteCabinetIds());

  window.addEventListener(FAVORITE_CABINETS_EVENT, handler);
  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener(FAVORITE_CABINETS_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
