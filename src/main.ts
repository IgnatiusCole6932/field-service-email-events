import { inspectFollowUp, sendTechnicianFollowUp } from "./field_campaign.js";

const technicianEmail = process.env.TECHNICIAN_EMAIL;
if (!technicianEmail) throw new Error("TECHNICIAN_EMAIL is required");

const sent = await sendTechnicianFollowUp({
  workOrderId: process.env.WORK_ORDER_ID ?? "WO-1042",
  technicianEmail,
  customerName: process.env.CUSTOMER_NAME ?? "Morgan",
  dispatchStatus: "complete",
  photoNames: ["arrival.jpg", "repair.jpg"],
  followUpNote: "Please confirm the repair notes and customer handoff."
});

const status = await inspectFollowUp(sent.messageId);
console.log(JSON.stringify({ messageId: sent.messageId, nextAction: status.nextAction }, null, 2));
