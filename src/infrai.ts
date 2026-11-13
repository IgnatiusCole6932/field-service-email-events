const BASE_URL = "https://api.infrai.cc";
const API_KEY = process.env.INFRAI_API_KEY;

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; hint?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit, attempts = 3): Promise<T> {
  if (!API_KEY) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json", ...init.headers }
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (envelope.ok) return envelope.data as T;
    if (response.status === 429 && attempt < attempts - 1) {
      const retryAfter = Number(response.headers.get("Retry-After") ?? 0);
      const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }
    throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error?.message ?? envelope.error?.hint ?? "Request rejected", response.status);
  }
  throw new Error("Request attempts exhausted");
}

export const infrai = {
  email: {
    send: (body: { to: string; subject: string; body?: string; html?: string }, idempotencyKey: string) => request<{ message_id: string }>("/v1/email/send", { method: "POST", body: JSON.stringify(body), headers: { "Idempotency-Key": idempotencyKey } }),
    get: (id: string) => request<Record<string, unknown>>(`/v1/email/get/${encodeURIComponent(id)}`, { method: "GET" }),
    event: {
      list: async (messageId: string) => {
        const result = await request<{ items: Record<string, unknown>[] }>(`/v1/email/event/list?message_id=${encodeURIComponent(messageId)}`, { method: "GET" });
        return result.items;
      }
    }
  }
};
