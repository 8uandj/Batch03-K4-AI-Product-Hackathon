import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { saveMockChunks, searchMockChunks } from "./mock-store.ts";

test("mock retrieval never returns another project's document content", () => {
  const projectA = `project-a-${randomUUID()}`;
  const projectB = `project-b-${randomUUID()}`;
  saveMockChunks(projectA, [{
    projectId: projectA,
    sourceId: "source-a",
    filename: "private-a.txt",
    chunkIndex: 0,
    content: "Mật khẩu riêng của project A là không được chia sẻ.",
    metadata: { mimeType: "text/plain", totalChunks: 1 },
  }]);

  const results = searchMockChunks(projectB, "mật khẩu riêng project A");
  assert.equal(results.some((result) => result.content.includes("project A")), false);
  assert.equal(results.some((result) => result.filename === "private-a.txt"), false);
});
