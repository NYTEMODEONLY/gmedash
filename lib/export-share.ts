export type ExportData = unknown;

export const createAnchorId = (...parts: Array<string | number | null | undefined>): string => {
  const slug = parts
    .filter((part) => part !== null && part !== undefined && String(part).trim().length > 0)
    .map((part) => String(part).trim())
    .join('-')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);

  return slug || 'gme-data-point';
};

export const createExportFilename = (title: string, extension = 'json'): string => (
  `${createAnchorId(title)}-${new Date().toISOString().slice(0, 10)}.${extension}`
);
