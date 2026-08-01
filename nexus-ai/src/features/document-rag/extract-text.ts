const TEXT_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
]);

const TEXT_EXTENSIONS = [".txt", ".md", ".markdown", ".csv", ".json"];
const DOCUMENT_EXTENSIONS = [".pdf", ".docx", ...TEXT_EXTENSIONS];
export const MAX_PUBLIC_NOTION_BYTES = 5 * 1024 * 1024;

export function isSupportedDocumentFile(file: Pick<File, "name" | "type">) {
  const name = file.name.toLowerCase();
  const extensionSupported = DOCUMENT_EXTENSIONS.some((extension) => name.endsWith(extension));
  if (!extensionSupported) return false;
  if (!file.type || file.type === "application/octet-stream") return true;
  return new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ...TEXT_TYPES,
  ]).has(file.type);
}

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const isText =
    TEXT_TYPES.has(file.type) || TEXT_EXTENSIONS.some((ext) => name.endsWith(ext));

  if (isText) return sanitizeExtractedText(await file.text());

  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    installPdfRuntimeCompatibility();
    const { extractText, getDocumentProxy } = await import("unpdf");
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocumentProxy(data);
    const result = await extractText(pdf, { mergePages: true });
    return sanitizeExtractedText(result.text);
  }

  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    const { extractRawText } = await import("mammoth");
    const result = await extractRawText({ arrayBuffer: await file.arrayBuffer() });
    const text = sanitizeExtractedText(result.value);
    if (!text) throw new Error("DOCX không chứa văn bản có thể lập chỉ mục.");
    return text;
  }

  throw new Error("Chỉ hỗ trợ PDF, DOCX, TXT, Markdown, CSV và JSON.");
}

/**
 * PDF.js bundled by unpdf calls Math.sumPrecise on newer runtimes. Node 24 does
 * not expose it yet, so install a numerically stable compatible implementation
 * before dynamically loading unpdf.
 */
function installPdfRuntimeCompatibility() {
  const math = Math as typeof Math & {
    sumPrecise?: (values: Iterable<number>) => number;
  };

  if (typeof math.sumPrecise === "function") return;

  Object.defineProperty(math, "sumPrecise", {
    configurable: true,
    value(values: Iterable<number>) {
      let sum = 0;
      let correction = 0;

      for (const value of values) {
        const adjusted = value - correction;
        const next = sum + adjusted;
        correction = next - sum - adjusted;
        sum = next;
      }

      return sum;
    },
  });
}

function sanitizeExtractedText(text: string) {
  return text
    .normalize("NFC")
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}


export async function extractTextFromPublicUrl(rawUrl: string): Promise<{ title: string; text: string }> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Notion URL không hợp lệ.");
  }
  assertAllowedNotionUrl(url);

  let response: Response | null = null;
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    response = await fetch(url, { signal: AbortSignal.timeout(15_000), redirect: "manual" });
    if (response.status < 300 || response.status >= 400) break;
    const location = response.headers.get("location");
    if (!location || redirect === 3) throw new Error("Notion URL chuyển hướng quá nhiều lần.");
    url = new URL(location, url);
    assertAllowedNotionUrl(url);
  }
  if (!response) throw new Error("Không thể tải public Notion page.");
  if (!response.ok) throw new Error("Không thể tải public Notion page.");
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_PUBLIC_NOTION_BYTES) throw new Error("Public Notion page vượt quá giới hạn 5 MB.");
  const html = await response.text();
  if (new TextEncoder().encode(html).byteLength > MAX_PUBLIC_NOTION_BYTES) throw new Error("Public Notion page vượt quá giới hạn 5 MB.");
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() || "Notion page";
  const textContent = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
  if (textContent.length < 20) throw new Error("Notion page không có nội dung đọc được.");
  return { title, text: sanitizeExtractedText(textContent) };
}

function assertAllowedNotionUrl(url: URL) {
  const hostname = url.hostname.toLowerCase();
  const allowedHost = hostname === "notion.site" || hostname.endsWith(".notion.site") || hostname === "notion.so" || hostname.endsWith(".notion.so");
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || !allowedHost) {
    throw new Error("MVP chỉ hỗ trợ public Notion URL.");
  }
}
