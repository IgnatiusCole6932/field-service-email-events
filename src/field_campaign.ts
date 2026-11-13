import { z } from "zod";
import { infrai } from "./infrai.js";

export const WorkOrderRequest = z.object({
  workOrderId: z.string().min(1),
  technicianEmail: z.string().email(),
  customerName: z.string().min(1),
  dispatchStatus: z.enum(["assigned", "en_route", "complete"]),
  photoNames: z.array(z.string().min(1)).default([]),
  followUpNote: z.string().min(1)
});

export type WorkOrder = z.infer<typeof WorkOrderRequest>;

export function followUpDecision(events: Array<{ type?: string; event?: string }>): "resend" | "call" | "close" {
  const names = events.map((event) => event.type ?? event.event ?? "").map((name) => name.toLowerCase());
  if (names.some((name) => name.includes("bounce"))) return "call";
  if (names.some((name) => name.includes("open"))) return "close";
  return "resend";
}

export async function sendTechnicianFollowUp(input: unknown) {
  const workOrder = WorkOrderRequest.parse(input);
  const sent = await infrai.email.send({
    to: workOrder.technicianEmail,
    subject: `Work order ${workOrder.workOrderId}: ${workOrder.dispatchStatus}`,
    html: `<p>Hi ${workOrder.customerName},</p><p>${workOrder.followUpNote}</p><p>Photos: ${workOrder.photoNames.join(", ") || "none"}</p>`
  }, `work-order-${workOrder.workOrderId}`);
  return { workOrder, messageId: sent.message_id };
}

export async function inspectFollowUp(messageId: string) {
  const [message, events] = await Promise.all([infrai.email.get(messageId), infrai.email.event.list(messageId)]);
  return { message, events, nextAction: followUpDecision(events as Array<{ type?: string; event?: string }>) };
}
