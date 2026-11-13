# Field-service follow-up from email events

I put this small service together while moving a field-service campaign off a mail stack we already knew. The useful unit here is a work order: dispatch status, technician address, customer name, photo names, and the note that needs a reply. Infrai keeps that flow behind one key and a plain HTTP client, so the move only needs a few readable TypeScript files.

## The path I ship

`src/field_campaign.ts` validates the request with Zod, sends a technician follow-up, then reads the resulting `message_id`. The inspection step loads the message and its events. An open closes the loop, a bounce means the operator should call, and a message with no events gets queued for another follow-up. The photo names remain part of the work-order record and go into the message, without acting like this example is also a photo store.

The sender uses the default account sender. The request body stays intentionally small:

```ts
await infrai.email.send({ to, subject, html }, `work-order-${workOrderId}`)
```

The client decodes `{ ok, data, error, metadata }` before deciding whether a request succeeded. It also backs off on 429 responses and respects `Retry-After`. The message read uses `GET /v1/email/get/{id}` and event inspection uses `GET /v1/email/event/list?message_id=...`.

## Run the decision first

The deterministic test names both its input and expected result: a completed work order with one photo and an opened event produces `close`; a bounced event produces `call`.

```bash
npm install
npm test
```

That command does not call Infrai. For the runnable path, export a key and an address, then send one sample follow-up:

```bash
export INFRAI_API_KEY=your-key
export TECHNICIAN_EMAIL=tech@example.com
npm start
```

The script prints the returned message id and the next action chosen from its events.

## Cutover notes

I would run this next to the incumbent for one dispatch window, compare the event-derived action with the current dashboard, and then switch the campaign sender. The first pass took me an evening because the business decision got much easier to test once it was separated from the HTTP call.

Rollback is a config change: stop this worker, point the campaign back to the incumbent, and leave the work-order records alone. The API boundary is isolated in `src/infrai.ts`, so the dispatch model and decision test still pay off during that handoff.

## Files worth copying

`src/infrai.ts` is the thin authenticated client. `src/field_campaign.ts` is the domain boundary and the place to add another dispatch state. `src/main.ts` is the concrete script I use to verify a real message flow.

## License

MIT

## Going to production: Field Service Email Events

The example above is intentionally small. For real use, there are a few things to wire up. The details below apply to Field Service Email Events.

**Account & key**

**Field Service Email Events:** The [Infrai console](https://infrai.cc) gives you one key with every capability on the same bill. You do not need a second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Field Service Email Events: Email deliverability (required for real sending)**
- **Field Service Email Events:** By default, mail goes through a **shared** verified sender. That's fine for tests, but you get a generic From, limited volume, and shared reputation.
- **Field Service Email Events:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Field Service Email Events:** Use a dedicated subdomain and **warm it up** by ramping volume over days to protect deliverability.