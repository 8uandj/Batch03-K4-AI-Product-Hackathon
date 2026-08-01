import test from "node:test";
import assert from "node:assert/strict";
import { assignmentWeights, forceAssignOverrideError, getAssignmentPhase, assignmentScore } from "./assignment.ts";

test("assignment weights shift toward capacity in sprint and emergency", () => {
  assert.deepEqual(assignmentWeights("normal"), { skill: 40, capacity: 25, urgency: 15, history: 10, workStyle: 10 });
  assert.equal(assignmentWeights("sprint").capacity, 35);
  assert.equal(assignmentWeights("emergency").urgency, 30);
});

test("project phase follows deadline and urgency", () => {
  assert.equal(getAssignmentPhase(10, false), "normal");
  assert.equal(getAssignmentPhase(5, false), "sprint");
  assert.equal(getAssignmentPhase(2, false), "emergency");
  assert.equal(getAssignmentPhase(20, true), "emergency");
});

test("score uses phase weights", () => {
  const normal = assignmentScore({ skillFit: 100, capacity: 0, urgency: 0, history: 0, workStyle: 0, phase: "normal" });
  const emergency = assignmentScore({ skillFit: 100, capacity: 0, urgency: 0, history: 0, workStyle: 0, phase: "emergency" });
  assert.equal(normal, 40);
  assert.equal(emergency, 20);
});

test("critical force assignment requires an emergency mitigation", () => {
  assert.equal(forceAssignOverrideError("high", "", ""), "assignment_confirmation_required");
  assert.equal(forceAssignOverrideError("critical", "PM accepts risk", "rebalance"), "emergency_override_required");
  assert.equal(forceAssignOverrideError("critical", "PM accepts risk", "emergency"), null);
});
