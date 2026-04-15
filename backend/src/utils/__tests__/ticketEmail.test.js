import { describe, expect, it } from "vitest";
import { buildEmailTickets } from "../ticketEmail.js";

describe("ticket email utilities", () => {
  it("builds cid QR image references and inline attachments", async () => {
    const result = await buildEmailTickets([
      {
        ticket_code: "SEM-TEST123",
        qr_value: "SEM-TEST123",
        ticket_tier: {
          name: "Standard",
        },
      },
    ]);

    expect(result.tickets).toEqual([
      {
        ticket_code: "SEM-TEST123",
        ticket_tier_name: "Standard",
        qr_src: expect.stringMatching(/^cid:ticket-qr-0-SEM-TEST123$/),
      },
    ]);
    expect(result.attachments).toEqual([
      expect.objectContaining({
        filename: "ticket-qr-1.png",
        content: expect.any(Buffer),
        contentType: "image/png",
        contentId: "ticket-qr-0-SEM-TEST123",
      }),
    ]);
  });
});
