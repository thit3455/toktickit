import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

import request from "supertest";

import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Ticket Attachments", () => {
  const prisma = getPrisma();

  let requesterAId: number;
  let requesterBId: number;
  let categoryId: number;
  let relatedSystemId: number;
  let ticketId: number;
  let attachmentId: number;

  beforeAll(async () => {
    const requesterResponse =
      await request(app).get(
        "/api/requesters"
      );

    requesterAId =
      requesterResponse.body.data[0].id;

    requesterBId =
      requesterResponse.body.data[1].id;

    const categoryResponse =
      await request(app).get(
        "/api/categories"
      );

    categoryId =
      categoryResponse.body[0].id;

    const systemResponse =
      await request(app).get(
        "/api/related-systems"
      );

    relatedSystemId =
      systemResponse.body.data[0].id;

    const createResponse =
      await request(app)
        .post("/api/tickets")
        .send({
          requesterId:
            requesterAId,

          categoryId,

          relatedSystemId,

          summary:
            "Attachment API test ticket",

          requestedPriority:
            "MEDIUM",

          description:
            "This ticket is used for attachment API testing.",
        });

    expect(
      createResponse.status
    ).toBe(201);

    ticketId =
      createResponse.body.data.id;
  });

  afterAll(async () => {
    if (ticketId) {
      await prisma.ticket.delete({
        where: {
          id: ticketId,
        },
      });
    }
  });

  it("uploads a valid attachment to an owned Ticket", async () => {
    const response =
      await request(app)
        .post(
          `/api/tickets/${ticketId}/attachments`
        )
        .query({
          requesterId:
            requesterAId,
        })
        .attach(
          "file",
          Buffer.from(
            "test pdf content"
          ),
          {
            filename:
              "evidence.pdf",

            contentType:
              "application/pdf",
          }
        );

    expect(
      response.status
    ).toBe(201);

    expect(
      response.body.data
    ).toMatchObject({
      ticketId,
      fileName:
        "evidence.pdf",
      mimeType:
        "application/pdf",
      isRemoved:
        false,
    });

    expect(
      response.body.data.id
    ).toBeDefined();

    // Save the created attachment ID
    // for the following tests.
    attachmentId =
      response.body.data.id;
  });

  it("blocks another Requester from uploading to the Ticket", async () => {
    const response =
      await request(app)
        .post(
          `/api/tickets/${ticketId}/attachments`
        )
        .query({
          requesterId:
            requesterBId,
        })
        .attach(
          "file",
          Buffer.from(
            "unauthorized"
          ),
          {
            filename:
              "blocked.pdf",

            contentType:
              "application/pdf",
          }
        );

    expect(
      response.status
    ).toBe(404);

    expect(
      response.body.error
    ).toBeDefined();
  });

  it("rejects an unsupported attachment type", async () => {
    const response =
      await request(app)
        .post(
          `/api/tickets/${ticketId}/attachments`
        )
        .query({
          requesterId:
            requesterAId,
        })
        .attach(
          "file",
          Buffer.from(
            "invalid file"
          ),
          {
            filename:
              "malware.exe",

            contentType:
              "application/octet-stream",
          }
        );

    expect(
      response.status
    ).toBe(400);

    expect(
      response.body.error
    ).toBeDefined();
  });

  it("requires an attachment file", async () => {
    const response =
      await request(app)
        .post(
          `/api/tickets/${ticketId}/attachments`
        )
        .query({
          requesterId:
            requesterAId,
        });

    expect(
      response.status
    ).toBe(400);

    expect(
      response.body.error
    ).toBeDefined();
  });

  it("lists attachment metadata for the owning Requester", async () => {
    const response =
      await request(app)
        .get(
          `/api/tickets/${ticketId}/attachments`
        )
        .query({
          requesterId:
            requesterAId,
        });

    expect(
      response.status
    ).toBe(200);

    expect(
      response.body.data
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id:
            attachmentId,
          ticketId,
          fileName:
            "evidence.pdf",
          mimeType:
            "application/pdf",
          isRemoved:
            false,
        }),
      ])
    );
  });

  it("downloads an active attachment owned by the selected Requester", async () => {
    const response =
      await request(app)
        .get(
          `/api/attachments/${attachmentId}/download`
        )
        .query({
          requesterId:
            requesterAId,
        });

    expect(
      response.status
    ).toBe(200);

    expect(
      response.headers[
        "content-type"
      ]
    ).toContain(
      "application/pdf"
    );

    expect(
      response.headers[
        "content-disposition"
      ]
    ).toContain(
      "evidence.pdf"
    );
  });

  it("blocks another Requester from directly downloading the attachment", async () => {
    const response =
      await request(app)
        .get(
          `/api/attachments/${attachmentId}/download`
        )
        .query({
          requesterId:
            requesterBId,
        });

    expect(
      response.status
    ).toBe(404);
  });

  it("soft-removes an owned attachment with a reason and retains metadata", async () => {
    const response =
      await request(app)
        .delete(
          `/api/attachments/${attachmentId}`
        )
        .query({
          requesterId:
            requesterAId,
        })
        .send({
          removalReason:
            "Uploaded wrong evidence file",
        });

    expect(
      response.status
    ).toBe(200);

    expect(
      response.body.data
    ).toMatchObject({
      id:
        attachmentId,
      isRemoved:
        true,
      removalReason:
        "Uploaded wrong evidence file",
    });

    expect(
      response.body.data.removedAt
    ).toBeDefined();

    const listResponse =
      await request(app)
        .get(
          `/api/tickets/${ticketId}/attachments`
        )
        .query({
          requesterId:
            requesterAId,
        });

    expect(
      listResponse.status
    ).toBe(200);

    expect(
      listResponse.body.data
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id:
            attachmentId,
          fileName:
            "evidence.pdf",
          isRemoved:
            true,
          removalReason:
            "Uploaded wrong evidence file",
        }),
      ])
    );
  });

  it("blocks downloading a soft-removed attachment", async () => {
    const response =
      await request(app)
        .get(
          `/api/attachments/${attachmentId}/download`
        )
        .query({
          requesterId:
            requesterAId,
        });

    expect(
      response.status
    ).toBe(404);
  });
});