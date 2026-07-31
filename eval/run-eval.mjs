import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const evalDir = path.dirname(new URL(import.meta.url).pathname);
const goldenSetPath = path.join(evalDir, "golden_set.json");
const systemPromptPath = path.join(evalDir, "system_prompt.md");
const resultsDir = path.join(evalDir, "results");
const resultJsonPath = path.join(resultsDir, "run-01.json");
const resultMarkdownPath = path.join(resultsDir, "run-01.md");

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error(
    "Thiếu OPENAI_API_KEY. Chạy bằng: node --env-file=nexus-ai/.env.local eval/run-eval.mjs",
  );
}

const goldenSetText = await fs.readFile(goldenSetPath, "utf8");
const goldenSet = JSON.parse(goldenSetText);
const systemPrompt = await fs.readFile(systemPromptPath, "utf8");

const outputSchema = {
  name: "nexus_task_decision",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      decision: {
        type: "string",
        enum: ["propose_tasks", "ask_clarification", "decline"],
      },
      summary: { type: "string" },
      tasks: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            assignee_id: { type: ["string", "null"] },
            deadline: { type: ["string", "null"] },
            reason: { type: "string" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
          },
          required: [
            "title",
            "assignee_id",
            "deadline",
            "reason",
            "confidence"
          ],
        },
      },
      risk_flags: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            type: {
              type: "string",
              enum: ["overload", "free_rider", "conflict", "deadline"],
            },
            member_id: { type: ["string", "null"] },
            evidence: { type: "string" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
          },
          required: ["type", "member_id", "evidence", "confidence"],
        },
      },
      clarifying_question: { type: ["string", "null"] },
    },
    required: [
      "decision",
      "summary",
      "tasks",
      "risk_flags",
      "clarifying_question"
    ],
  },
};

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalize(value) {
  return String(value ?? "").toLocaleLowerCase("vi");
}

function includesAllKeywords(value, keywords) {
  const normalized = normalize(value);
  return keywords.every((keyword) => normalized.includes(normalize(keyword)));
}

function gradeCase(testCase, output) {
  const failures = [];
  const expected = testCase.expected;
  const tasks = Array.isArray(output.tasks) ? output.tasks : [];
  const risks = Array.isArray(output.risk_flags) ? output.risk_flags : [];
  const memberIds = new Set(testCase.members.map((member) => member.id));

  if (!expected.allowed_decisions.includes(output.decision)) {
    failures.push(
      `decision=${output.decision}; expected ${expected.allowed_decisions.join("|")}`,
    );
  }

  if (tasks.length < expected.min_tasks || tasks.length > expected.max_tasks) {
    failures.push(
      `tasks=${tasks.length}; expected ${expected.min_tasks}-${expected.max_tasks}`,
    );
  }

  for (const task of tasks) {
    if (task.assignee_id !== null && !memberIds.has(task.assignee_id)) {
      failures.push(`invented assignee_id=${task.assignee_id}`);
    }
  }

  if (
    expected.assignee_must_be_null &&
    tasks.some((task) => task.assignee_id !== null)
  ) {
    failures.push("assignee_id must remain null");
  }

  if (
    expected.deadline_must_be_null &&
    tasks.some((task) => task.deadline !== null)
  ) {
    failures.push("deadline must remain null");
  }

  if (
    expected.deadline_must_be_present &&
    tasks.some((task) => !task.deadline)
  ) {
    failures.push("explicit deadline was not preserved");
  }

  for (const assigneeId of expected.forbidden_assignee_ids ?? []) {
    if (tasks.some((task) => task.assignee_id === assigneeId)) {
      failures.push(`forbidden assignee_id=${assigneeId}`);
    }
  }

  const taskTitles = tasks.map((task) => task.title).join(" | ");
  for (const keywords of expected.required_task_keywords ?? []) {
    if (!includesAllKeywords(taskTitles, keywords)) {
      failures.push(`missing task keywords: ${keywords.join("+")}`);
    }
  }

  for (const mapping of expected.expected_assignee_by_keyword ?? []) {
    const matchingTask = tasks.find((task) =>
      normalize(task.title).includes(normalize(mapping.keyword)),
    );
    if (!matchingTask || matchingTask.assignee_id !== mapping.assignee_id) {
      failures.push(
        `task "${mapping.keyword}" expected assignee=${mapping.assignee_id}`,
      );
    }
  }

  const riskTypes = new Set(risks.map((risk) => risk.type));
  for (const riskType of expected.required_risk_types ?? []) {
    if (!riskTypes.has(riskType)) {
      failures.push(`missing risk flag=${riskType}`);
    }
  }

  if (
    expected.clarifying_question_required &&
    !String(output.clarifying_question ?? "").trim()
  ) {
    failures.push("clarifying question is required");
  }

  const completeOutput = JSON.stringify(output);
  for (const term of expected.forbidden_terms ?? []) {
    if (normalize(completeOutput).includes(normalize(term))) {
      failures.push(`forbidden term used: ${term}`);
    }
  }

  return {
    pass: failures.length === 0,
    failures,
  };
}

async function callModel(testCase, attempt = 1) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: goldenSet.model,
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: JSON.stringify({
            members: testCase.members,
            chat: testCase.chat,
          }),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: outputSchema,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    if (attempt < 3 && (response.status === 429 || response.status >= 500)) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      return callModel(testCase, attempt + 1);
    }
    throw new Error(
      `OpenAI API ${response.status} for ${testCase.id}: ${body.slice(0, 500)}`,
    );
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`Model returned no content for ${testCase.id}`);
  }

  return {
    output: JSON.parse(content),
    responseId: payload.id,
    returnedModel: payload.model,
    usage: payload.usage ?? null,
  };
}

const startedAt = new Date().toISOString();
const caseResults = [];

for (const [index, testCase] of goldenSet.cases.entries()) {
  process.stdout.write(
    `[${String(index + 1).padStart(2, "0")}/${goldenSet.cases.length}] ${testCase.id} ... `,
  );

  try {
    const modelResult = await callModel(testCase);
    const grade = gradeCase(testCase, modelResult.output);
    caseResults.push({
      id: testCase.id,
      category: testCase.category,
      source: testCase.source,
      input: {
        members: testCase.members,
        chat: testCase.chat,
      },
      expected: testCase.expected,
      actual: modelResult.output,
      pass: grade.pass,
      failures: grade.failures,
      response_id: modelResult.responseId,
      returned_model: modelResult.returnedModel,
      usage: modelResult.usage,
    });
    console.log(grade.pass ? "PASS" : `FAIL (${grade.failures.join("; ")})`);
  } catch (error) {
    caseResults.push({
      id: testCase.id,
      category: testCase.category,
      source: testCase.source,
      input: {
        members: testCase.members,
        chat: testCase.chat,
      },
      expected: testCase.expected,
      actual: null,
      pass: false,
      failures: [error instanceof Error ? error.message : String(error)],
      response_id: null,
      returned_model: null,
      usage: null,
    });
    console.log("ERROR");
  }
}

const passed = caseResults.filter((result) => result.pass).length;
const total = caseResults.length;
const passRate = total === 0 ? 0 : passed / total;
const hardConstraintViolations = caseResults.filter((result) =>
  result.failures.some(
    (failure) =>
      failure.includes("invented assignee_id") ||
      failure.includes("assignee_id must remain null") ||
      failure.includes("deadline must remain null"),
  ),
);

const summary = {
  run_id: "run-01",
  started_at: startedAt,
  completed_at: new Date().toISOString(),
  requested_model: goldenSet.model,
  prompt_sha256: sha256(systemPrompt),
  golden_set_sha256: sha256(goldenSetText),
  total,
  passed,
  failed: total - passed,
  pass_rate: passRate,
  quality_bar: goldenSet.quality_bar,
  meets_percentage_bar:
    passRate >= goldenSet.quality_bar.minimum_pass_rate,
  hard_constraint_violations: hardConstraintViolations.map(
    (result) => result.id,
  ),
  meets_hard_constraint: hardConstraintViolations.length === 0,
  source_counts: {
    survey: caseResults.filter((result) => result.source === "survey").length,
    synthetic: caseResults.filter((result) => result.source === "synthetic")
      .length,
  },
  category_counts: Object.fromEntries(
    [...new Set(caseResults.map((result) => result.category))].map(
      (category) => [
        category,
        caseResults.filter((result) => result.category === category).length,
      ],
    ),
  ),
};

await fs.mkdir(resultsDir, { recursive: true });
await fs.writeFile(
  resultJsonPath,
  `${JSON.stringify({ summary, cases: caseResults }, null, 2)}\n`,
);

const markdownRows = caseResults
  .map(
    (result) =>
      `| ${result.id} | ${result.category} | ${result.source} | ${
        result.pass ? "PASS" : "FAIL"
      } | ${result.failures.join("; ").replaceAll("|", "\\|") || "—"} |`,
  )
  .join("\n");

const markdown = `# Eval Run 01 — Nexus Auto-Tasking

- Model yêu cầu: \`${summary.requested_model}\`
- Kết quả: **${passed}/${total}** (${(passRate * 100).toFixed(1)}%)
- Chuẩn phần trăm: ≥${(
  goldenSet.quality_bar.minimum_pass_rate * 100
).toFixed(0)}% — ${summary.meets_percentage_bar ? "ĐẠT" : "CHƯA ĐẠT"}
- Điều kiện cứng: ${goldenSet.quality_bar.hard_constraint}
- Vi phạm điều kiện cứng: ${
  summary.hard_constraint_violations.length
    ? summary.hard_constraint_violations.join(", ")
    : "Không có"
}
- Case từ khảo sát: ${summary.source_counts.survey}/${total}
- Bắt đầu: ${summary.started_at}
- Hoàn tất: ${summary.completed_at}

| Case | Loại | Nguồn | Kết quả | Lý do fail |
|---|---|---|---|---|
${markdownRows}

Chi tiết input, expected output, actual output, response ID và token usage nằm trong
\`eval/results/run-01.json\`.
`;

await fs.writeFile(resultMarkdownPath, markdown);
console.log(`\nRESULT ${passed}/${total} (${(passRate * 100).toFixed(1)}%)`);
console.log(`Saved ${resultJsonPath}`);
console.log(`Saved ${resultMarkdownPath}`);
