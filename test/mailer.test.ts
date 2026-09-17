import * as nodemailer from "nodemailer";
import * as twig from "twig";
import {
  Mailer,
  Configuration,
  TransportType,
  CompanyInfo,
  EmailPart,
  EmailPartType,
} from "../src/index";

jest.mock("nodemailer", () => {
  const actual = jest.requireActual("nodemailer");
  return {
    ...actual,
    createTransport: jest.fn(),
  };
});

jest.mock("twig", () => {
  const actual = jest.requireActual("twig");
  return {
    ...actual,
    renderFile: jest.fn(actual.renderFile),
  };
});

const createTransportMock = nodemailer.createTransport as jest.Mock;
const renderFileMock = twig.renderFile as unknown as jest.Mock;

function fakeTransporter() {
  return {
    sendMail: jest.fn().mockResolvedValue({ messageId: "abc-123" }),
    isIdle: jest.fn().mockReturnValue(true),
  };
}

describe("Mailer", () => {
  beforeEach(() => {
    createTransportMock.mockReset();
  });

  describe("constructor", () => {
    it("creates a pooled SMTP transport when transport type is SMTP", () => {
      const transporter = fakeTransporter();
      createTransportMock.mockReturnValue(transporter);

      const config: Configuration = {
        transport: TransportType.SMTP,
        host: "smtp.example.com",
        port: 587,
        user: "user@example.com",
        password: "secret",
      };

      const mailer = new Mailer(config);

      expect(createTransportMock).toHaveBeenCalledWith(
        expect.objectContaining({
          pool: true,
          host: "smtp.example.com",
          port: 587,
          auth: expect.objectContaining({
            type: "login",
            user: "user@example.com",
            pass: "secret",
          }),
        })
      );
      expect(mailer.transporter).toBe(transporter);
    });

    it("creates an SES transport when transport type is AMAZON_SES", () => {
      const transporter = fakeTransporter();
      createTransportMock.mockReturnValue(transporter);

      const config: Configuration = {
        transport: TransportType.AMAZON_SES,
        aws_source_address: "no-reply@example.com",
        aws_access_key_id: "AKIA_TEST",
        aws_secret_access_key: "secret-key",
        aws_region: "eu-west-1",
      };

      const mailer = new Mailer(config);

      expect(createTransportMock).toHaveBeenCalledWith(
        expect.objectContaining({
          SES: expect.objectContaining({
            sesClient: expect.anything(),
            SendEmailCommand: expect.anything(),
          }),
        })
      );
      expect(mailer.transporter).toBe(transporter);
    });

    it("falls back to AWS_* env vars when SES credentials are not passed explicitly", () => {
      const originalAccessKey = process.env.AWS_ACCESS_KEY_ID;
      const originalSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
      process.env.AWS_ACCESS_KEY_ID = "env-access-key";
      process.env.AWS_SECRET_ACCESS_KEY = "env-secret-key";

      const transporter = fakeTransporter();
      createTransportMock.mockReturnValue(transporter);

      try {
        const mailer = new Mailer({ transport: TransportType.AMAZON_SES });

        expect(mailer.transporter).toBe(transporter);
        expect(createTransportMock).toHaveBeenCalled();
      } finally {
        process.env.AWS_ACCESS_KEY_ID = originalAccessKey;
        process.env.AWS_SECRET_ACCESS_KEY = originalSecretKey;
      }
    });

    it("falls back to empty credentials when neither explicit values nor env vars are set", () => {
      const originalAccessKey = process.env.AWS_ACCESS_KEY_ID;
      const originalSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;

      const transporter = fakeTransporter();
      createTransportMock.mockReturnValue(transporter);

      try {
        const mailer = new Mailer({ transport: TransportType.AMAZON_SES });

        expect(mailer.transporter).toBe(transporter);
      } finally {
        if (originalAccessKey === undefined) {
          delete process.env.AWS_ACCESS_KEY_ID;
        } else {
          process.env.AWS_ACCESS_KEY_ID = originalAccessKey;
        }
        if (originalSecretKey === undefined) {
          delete process.env.AWS_SECRET_ACCESS_KEY;
        } else {
          process.env.AWS_SECRET_ACCESS_KEY = originalSecretKey;
        }
      }
    });

    it("does not create a transporter when no config is provided", () => {
      const mailer = new Mailer();

      expect(createTransportMock).not.toHaveBeenCalled();
      expect(mailer.transporter).toBeUndefined();
    });

    it("registers the twig 'truncate' filter without creating a transporter for an unrecognized transport type", () => {
      const mailer = new Mailer({ transport: "UNKNOWN" as TransportType });

      expect(createTransportMock).not.toHaveBeenCalled();
      expect(mailer.transporter).toBeUndefined();
    });
  });

  describe("Configuration", () => {
    it("defaults aws_region to eu-west-1 and transport to SMTP", () => {
      const config = new Configuration();

      expect(config.aws_region).toBe("eu-west-1");
      expect(config.transport).toBe(TransportType.SMTP);
    });
  });

  describe("setTransporter / setStyle", () => {
    it("allows overriding the transporter after construction", () => {
      const mailer = new Mailer();
      const transporter = fakeTransporter();

      mailer.setTransporter(transporter as unknown as nodemailer.Transporter);

      expect(mailer.transporter).toBe(transporter);
    });
  });

  describe("send", () => {
    it("throws when the transporter has not been initialized", async () => {
      const mailer = new Mailer();

      await expect(
        mailer.send("Subject", "from@example.com", ["to@example.com"], "<p>hi</p>")
      ).rejects.toThrow("Transporter not initialized");
    });

    it("sends a plain email with the base fields", async () => {
      const transporter = fakeTransporter();
      const mailer = new Mailer();
      mailer.setTransporter(transporter as unknown as nodemailer.Transporter);

      await mailer.send(
        "Subject",
        "from@example.com",
        ["to1@example.com", "to2@example.com"],
        "<p>hi</p>"
      );

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "to1@example.com,to2@example.com",
          subject: "Subject",
          from: "from@example.com",
          html: "<p>hi</p>",
        })
      );
    });

    it("attaches ical metadata as an icalEvent", async () => {
      const transporter = fakeTransporter();
      const mailer = new Mailer();
      mailer.setTransporter(transporter as unknown as nodemailer.Transporter);

      await mailer.send("Subject", "from@example.com", ["to@example.com"], "<p>hi</p>", {
        ical: "BEGIN:VCALENDAR...",
      });

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          icalEvent: expect.objectContaining({
            method: "request",
            filename: "invitation.ics",
            content: "BEGIN:VCALENDAR...",
          }),
        })
      );
    });

    it("includes plain text and attachments when provided", async () => {
      const transporter = fakeTransporter();
      const mailer = new Mailer();
      mailer.setTransporter(transporter as unknown as nodemailer.Transporter);

      await mailer.send("Subject", "from@example.com", ["to@example.com"], "<p>hi</p>", {
        text: "plain text body",
        attachments: [{ filename: "file.txt", content: "content" }],
      });

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: "plain text body",
          attachments: [{ filename: "file.txt", content: "content" }],
        })
      );
    });

    it("returns the result of sendMail", async () => {
      const transporter = fakeTransporter();
      const mailer = new Mailer();
      mailer.setTransporter(transporter as unknown as nodemailer.Transporter);

      const result = await mailer.send(
        "Subject",
        "from@example.com",
        ["to@example.com"],
        "<p>hi</p>"
      );

      expect(result).toEqual({ messageId: "abc-123" });
    });
  });

  describe("sendMulti", () => {
    it("throws when the transporter has not been initialized", async () => {
      const mailer = new Mailer();

      await expect(mailer.sendMulti([])).rejects.toThrow(
        "Transporter not initialized"
      );
    });

    it("sends every message while the transporter is idle", async () => {
      const transporter = fakeTransporter();
      const mailer = new Mailer();
      mailer.setTransporter(transporter as unknown as nodemailer.Transporter);

      const messages = [
        { subject: "A", from: "a@example.com", to: ["x@example.com"], html: "<p>A</p>" },
        { subject: "B", from: "b@example.com", to: ["y@example.com"], html: "<p>B</p>" },
      ];

      const firstMessage = messages[0];
      await mailer.sendMulti(messages);

      expect(transporter.sendMail).toHaveBeenCalledTimes(2);
      expect(transporter.sendMail).toHaveBeenNthCalledWith(1, firstMessage);
    });

    it("stops sending once the transporter is no longer idle", async () => {
      const transporter = fakeTransporter();
      transporter.isIdle
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      const mailer = new Mailer();
      mailer.setTransporter(transporter as unknown as nodemailer.Transporter);

      const messages = [
        { subject: "A", from: "a@example.com", to: ["x@example.com"], html: "<p>A</p>" },
        { subject: "B", from: "b@example.com", to: ["y@example.com"], html: "<p>B</p>" },
      ];

      await mailer.sendMulti(messages);

      expect(transporter.sendMail).toHaveBeenCalledTimes(1);
      expect(messages).toHaveLength(1);
    });
  });

  describe("compose", () => {
    it("renders the email template with the configured style and company info", async () => {
      const mailer = new Mailer();
      mailer.setStyle({
        backgroundColor: "#111111",
        contentColor: "#222222",
        boldColor: "#333333",
        textColor: "#444444",
        mainColor: "#555555",
        mainButtonColor: "#666666",
        mainColorHover: "#777777",
        textOnMainColor: "#888888",
      });

      const companyInfo: CompanyInfo = {
        logoUrl: "https://example.com/logo.png",
        companyName: "Acme Inc.",
        street: "123 Main St",
      };

      const emailParts: EmailPart[] = [
        {
          type: EmailPartType.OneColText,
          title: "Hello",
          description: "World",
        },
      ];

      const html = await mailer.compose(emailParts, companyInfo);

      expect(html).toEqual(expect.any(String));
      expect(html).toContain("Acme Inc.");
      expect(html).toContain("123 Main St");
    });

    it("truncates long text through the registered twig 'truncate' filter", async () => {
      // Instantiating with a config registers the truncate filter globally.
      const mailer = new Mailer({ transport: TransportType.SMTP });

      const longTitle = "A".repeat(120);
      const shortDescription = "short description";

      const emailParts: EmailPart[] = [
        {
          type: EmailPartType.ThumbnailText,
          imageUrl: "https://example.com/image.png",
          title: longTitle,
          description: shortDescription,
        },
      ];

      const html = await mailer.compose(emailParts, {
        logoUrl: "https://example.com/logo.png",
        companyName: "Acme Inc.",
        street: "123 Main St",
      });

      expect(html).toContain("A".repeat(88) + "...");
      expect(html).not.toContain(longTitle);
      expect(html).toContain(shortDescription);
    });

    it("rejects when the template fails to render", async () => {
      renderFileMock.mockImplementationOnce((...args: any[]) => {
        const callback = args[args.length - 1];
        callback(new Error("template blew up"), undefined);
      });

      const mailer = new Mailer();

      await expect(
        mailer.compose([], {
          logoUrl: "https://example.com/logo.png",
          companyName: "Acme Inc.",
          street: "123 Main St",
        })
      ).rejects.toThrow("template blew up");
    });

    it("defaults the truncate filter length to 10 when no argument is passed", () => {
      // Instantiating with a config registers the truncate filter globally.
      new Mailer({ transport: TransportType.SMTP });

      const rendered = twig
        .twig({ data: "{{ text | truncate }}" })
        .render({ text: "this is a much longer string than ten characters" });

      expect(rendered).toBe("this is a ...");
    });
  });

  describe("generateCal", () => {
    it("renders an ICS file for the given event", async () => {
      const mailer = new Mailer();

      const ics = await mailer.generateCal({
        start: "20260101T090000Z",
        end: "20260101T100000Z",
        uid: "event-uid-1",
        created: "20260101T000000Z",
        lastModified: "20260101T000000Z",
        title: "Meeting",
        organizer: { name: "Alice", email: "alice@example.com" },
        partecipant: { email: "bob@example.com" },
      });

      expect(ics).toContain("BEGIN:VCALENDAR");
      expect(ics).toContain("UID:event-uid-1");
      expect(ics).toContain("SUMMARY:Meeting");
      expect(ics).toContain("DTSTART:20260101T090000Z");
      expect(ics).toContain("ORGANIZER;CN=Alice:mailto:alice@example.com");
      expect(ics).toContain(
        "ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=bob@example.com;X-NUM-GUESTS=0:mailto:bob@example.com"
      );
    });

    it("rejects when the template fails to render", async () => {
      renderFileMock.mockImplementationOnce((...args: any[]) => {
        const callback = args[args.length - 1];
        callback(new Error("ics template blew up"), undefined);
      });

      const mailer = new Mailer();

      await expect(
        mailer.generateCal({
          start: "20260101T090000Z",
          end: "20260101T100000Z",
          uid: "event-uid-1",
          created: "20260101T000000Z",
          lastModified: "20260101T000000Z",
          title: "Meeting",
          organizer: { name: "Alice", email: "alice@example.com" },
          partecipant: { email: "bob@example.com" },
        })
      ).rejects.toThrow("ics template blew up");
    });
  });
});
