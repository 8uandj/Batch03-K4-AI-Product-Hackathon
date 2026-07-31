import assert from "node:assert/strict";
import test from "node:test";

import {
  canReceiveReworkAlert,
  formatRemainingDeadline,
  selectProactiveCheckIn,
} from "./checkin.ts";

const NOW = new Date("2026-07-31T12:00:00.000Z");
const BASE_INPUT = {
  projectId: "project-1",
  userId: "member-1",
  userName: "Hữu Khanh",
  now: NOW,
};

test("chỉ member được nhận bong bóng Rework", () => {
  assert.equal(canReceiveReworkAlert("member"), true);
  assert.equal(canReceiveReworkAlert("pm"), false);
});

test("không hiện bong bóng khi member không có task Rework", () => {
  const result = selectProactiveCheckIn({
    ...BASE_INPUT,
    tasks: [
      {
        id: "task-1",
        title: "Task đang làm",
        status: "doing",
        due_at: "2026-08-02T12:00:00.000Z",
      },
    ],
  });

  assert.equal(result, null);
});

test("bong bóng chứa đúng task và deadline còn lại", () => {
  const result = selectProactiveCheckIn({
    ...BASE_INPUT,
    tasks: [
      {
        id: "task-rework",
        title: "Hoàn thiện API Kanban",
        status: "rework",
        due_at: "2026-08-02T18:00:00.000Z",
        updated_at: "2026-07-31T11:59:00.000Z",
      },
    ],
  });

  assert.equal(result?.kind, "rework");
  assert.equal(result?.task.id, "task-rework");
  assert.match(result?.message ?? "", /Hoàn thiện API Kanban/);
  assert.equal(result?.task.remainingDeadline, "Còn 2 ngày 6 giờ nữa đến hạn");
});

test("mỗi lần task được Rework lại tạo id cảnh báo mới", () => {
  const first = selectProactiveCheckIn({
    ...BASE_INPUT,
    tasks: [
      {
        id: "task-rework",
        title: "Task cần sửa",
        status: "rework",
        updated_at: "2026-07-31T10:00:00.000Z",
      },
    ],
  });
  const second = selectProactiveCheckIn({
    ...BASE_INPUT,
    tasks: [
      {
        id: "task-rework",
        title: "Task cần sửa",
        status: "rework",
        updated_at: "2026-07-31T11:00:00.000Z",
      },
    ],
  });

  assert.notEqual(first?.id, second?.id);
});

test("định dạng deadline quá hạn và chưa thiết lập", () => {
  assert.equal(formatRemainingDeadline(null, NOW), "Chưa thiết lập deadline");
  assert.equal(
    formatRemainingDeadline("2026-07-30T10:00:00.000Z", NOW),
    "Đã quá hạn 1 ngày 2 giờ (Cần sửa gấp!)",
  );
});
