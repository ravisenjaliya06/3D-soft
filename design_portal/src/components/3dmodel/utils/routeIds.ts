export type DesignRouteIds = { designId?: string; versionId?: string };

export function parseDesignIdsFromPathname(pathname: string): DesignRouteIds {
  const parts = pathname.split('/').filter(Boolean);

  // Expected routes (examples):
  // - /design/<designId>
  // - /design/<designId>/<versionId>
  // - /lab/design/<designId>
  // - /lab/design/<designId>/<versionId>
  const designIdx = parts.findIndex((p) => p.toLowerCase() === 'design');
  if (designIdx >= 0) {
    return { designId: parts[designIdx + 1], versionId: parts[designIdx + 2] };
  }

  // Fallback (legacy/unknown shapes).
  return { designId: parts[1], versionId: parts[2] };
}

export function gettingDesignID(pathname?: string): string | undefined {
  const p =
    pathname ??
    (typeof window !== 'undefined' && window.location?.pathname ? window.location.pathname : '');
  if (!p) return undefined;
  return parseDesignIdsFromPathname(p).designId;
}

export function gettingVersionID(pathname?: string): string | undefined {
  const p =
    pathname ??
    (typeof window !== 'undefined' && window.location?.pathname ? window.location.pathname : '');
  if (!p) return undefined;
  return parseDesignIdsFromPathname(p).versionId;
}

export function getDesignIdsFromRouter(router: any): DesignRouteIds {
  const designId =
    (router?.query?.designid as string | undefined) ??
    (router?.query?.designId as string | undefined) ??
    gettingDesignID();

  const versionId =
    (router?.query?.versionid as string | undefined) ??
    (router?.query?.versionId as string | undefined) ??
    gettingVersionID();

  return { designId: designId || undefined, versionId: versionId || undefined };
}
