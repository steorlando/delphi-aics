export const consultationFiguresBucketName = "consultation-figures";

export const consultationFigureAllowedMimeTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export const consultationFigureMaxBytes = 8 * 1024 * 1024;

export type StoredFigureEntry = {
  created_at: string | null;
  mime_type: string | null;
  name: string;
  path: string;
  public_url: string;
  size_bytes: number | null;
  updated_at: string | null;
};

export function getAcceptedFigureMimeTypes() {
  return consultationFigureAllowedMimeTypes.join(",");
}

export function formatFigureFileSize(value: number | null) {
  if (!value || value <= 0) {
    return "Dimensione non disponibile";
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const maximumFractionDigits = unitIndex === 0 ? 0 : 1;

  return `${size.toLocaleString("it-IT", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  })} ${units[unitIndex]}`;
}

export function buildFigureHtmlSnippet(publicUrl: string) {
  return buildFigureHtmlSnippetWithContent(publicUrl, "Descrizione figura", "Didascalia figura.");
}

export function buildFigureHtmlSnippetWithContent(
  publicUrl: string,
  altText: string,
  captionText: string,
) {
  const escapedUrl = escapeHtmlAttribute(publicUrl);
  const escapedAlt = escapeHtmlAttribute(altText || "Descrizione figura");
  const escapedCaption = escapeHtmlText(captionText || "Didascalia figura.");

  return [
    '<figure class="document-inline-figure">',
    `  <img src="${escapedUrl}" alt="${escapedAlt}" />`,
    `  <figcaption>${escapedCaption}</figcaption>`,
    "</figure>",
  ].join("\n");
}

export function buildStoredFigurePath(fileName: string, label?: string | null) {
  const extension = getFileExtension(fileName);
  const normalizedLabel = normalizeStorageSegment(label || fileName.replace(/\.[^.]+$/, ""));
  const safeBaseName = normalizedLabel || "figura";
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  const randomSuffix = crypto.randomUUID().slice(0, 8);

  return `${timestamp}-${randomSuffix}-${safeBaseName}${extension}`;
}

function getFileExtension(fileName: string) {
  const match = fileName.toLowerCase().match(/(\.[a-z0-9]+)$/);
  return match ? match[1] : "";
}

function normalizeStorageSegment(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function escapeHtmlText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtmlAttribute(value: string) {
  return escapeHtmlText(value).replace(/"/g, "&quot;");
}
