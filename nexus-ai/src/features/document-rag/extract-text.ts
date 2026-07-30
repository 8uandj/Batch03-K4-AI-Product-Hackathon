const TEXT_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
]);

const TEXT_EXTENSIONS = [".txt", ".md", ".markdown", ".csv", ".json"];

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

  throw new Error("Chỉ hỗ trợ PDF, TXT, Markdown, CSV và JSON.");
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
