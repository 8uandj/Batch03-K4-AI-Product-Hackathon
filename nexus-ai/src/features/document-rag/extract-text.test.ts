import assert from "node:assert/strict";
import test from "node:test";

import { extractTextFromFile, isSupportedDocumentFile } from "./extract-text.ts";

test("extracts and normalizes text documents", async () => {
  const file = new File(["  Mục tiêu\u0000\n\n  NexusAI  "], "brief.txt", { type: "text/plain" });
  assert.equal(await extractTextFromFile(file), "Mục tiêu\n\n  NexusAI");
});

test("rejects unsupported document formats with an actionable message", async () => {
  const file = new File(["image"], "brief.png", { type: "image/png" });
  await assert.rejects(() => extractTextFromFile(file), /PDF, DOCX, TXT/);
});

test("accepts DOCX and rejects MIME-spoofed uploads at the route boundary", () => {
  assert.equal(isSupportedDocumentFile({ name: "cv.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), true);
  assert.equal(isSupportedDocumentFile({ name: "brief.pdf", type: "image/png" }), false);
  assert.equal(isSupportedDocumentFile({ name: "notes.txt", type: "" }), true);
});
