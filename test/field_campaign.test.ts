import assert from "node:assert/strict";
import { followUpDecision, WorkOrderRequest } from "../src/field_campaign.js";

const input = WorkOrderRequest.parse({
  workOrderId: "WO-7",
  technicianEmail: "tech@example.com",
  customerName: "Lee",
  dispatchStatus: "complete",
  photoNames: ["repair.jpg"],
  followUpNote: "Please confirm the handoff."
});

assert.equal(input.dispatchStatus, "complete");
assert.equal(followUpDecision([{ type: "delivered" }, { type: "opened" }]), "close");
assert.equal(followUpDecision([{ type: "bounced" }]), "call");
console.log("field campaign decision test passed");
