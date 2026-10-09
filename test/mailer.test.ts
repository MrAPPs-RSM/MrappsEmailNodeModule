import * as nodemailer from "nodemailer";
import * as twig from "twig";
import {
  Mailer,
  Configuration,
  TransportType,
  CompanyInfo,
  EmailPart,
  EmailPartType,
  EmailMessage,
  EventAttribute,
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
    twig: jest.fn(actual.twig),
  };
});

const createTransportMock = nodemailer.createTransport as jest.Mock;
const twigMock = twig.twig as unknown as jest.Mock;

function fakeTransporter() {
  return {
    sendMail: jest.fn().mockResolvedValue({ messageId: "abc-123" }),
    isIdle: jest.fn().mockReturnValue(true),
    close: jest.fn(),
    verify: jest.fn().mockResolvedValue(true),
  };
}

const companyInfo: CompanyInfo = {
  logoUrl: "https://example.com/logo.png",
  companyName: "Acme Inc.",
  street: "123 Main St",
};

const style = {
  backgroundColor: "#111111",
  contentColor: "#222222",
  boldColor: "#333333",
  textColor: "#444444",
  mainColor: "#555555",
  mainButtonColor: "#666666",
  mainColorHover: "#777777",
  textOnMainColor: "#888888",
};

const event: EventAttribute = {
  start: "20260101T090000Z",
  end: "20260101T100000Z",
  uid: "event-uid-1",
  created: "20251231T000000Z",
  lastModified: "20260101T000000Z",
  title: "Meeting",
  organizer: { name: "Alice", email: "alice@example.com" },
  partecipant: { email: "bob@example.com" },
};

function rows(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    imageUrl: `https://example.com/img${i}.png`,
    description: `ROW${i}`,
  }));
}

function message(subject: string): EmailMessage {
  return { subject, from: "from@example.com", to: ["to@example.com"], html: `<p>${subject}</p>` };
}

function withEnv(vars: Record<string, string | undefined>, fn: () => void | Promise<void>) {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(vars)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  const restore = () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
  return Promise.resolve()
    .then(fn)
    .finally(restore);
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
          auth: expect.objectContaining({ type: "login", user: "user@example.com", pass: "secret" }),
        })
      );
      expect(mailer.transporter).toBe(transporter);
    });

    it("defaults to SMTP when a plain config object omits transport", () => {
      createTransportMock.mockReturnValue(fakeTransporter());

      new Mailer({ host: "smtp.example.com", port: 25 });

      expect(createTransportMock).toHaveBeenCalledWith(expect.objectContaining({ pool: true, host: "smtp.example.com" }));
    });

    it("creates an SES transport with explicit credentials when transport type is AMAZON_SES", async () => {
      const transporter = fakeTransporter();
      createTransportMock.mockReturnValue(transporter);

      const mailer = new Mailer({
        transport: TransportType.AMAZON_SES,
        aws_source_address: "no-reply@example.com",
        aws_access_key_id: "AKIA_TEST",
        aws_secret_access_key: "secret-key",
        aws_region: "us-east-1",
      });

      expect(createTransportMock).toHaveBeenCalledWith(
        expect.objectContaining({
          SES: expect.objectContaining({ sesClient: expect.anything(), SendEmailCommand: expect.anything() }),
        })
      );
      expect(mailer.transporter).toBe(transporter);

      const sesClient = (mailer as any).sesClient;
      await expect(sesClient.config.region()).resolves.toBe("us-east-1");
      await expect(sesClient.config.credentials()).resolves.toMatchObject({
        accessKeyId: "AKIA_TEST",
        secretAccessKey: "secret-key",
      });
    });

    it("defaults the SES region to eu-west-1", async () => {
      createTransportMock.mockReturnValue(fakeTransporter());

      const mailer = new Mailer({ transport: TransportType.AMAZON_SES });

      await expect((mailer as any).sesClient.config.region()).resolves.toBe("eu-west-1");
    });

    it("leaves credential resolution to the SDK default chain when no keys are passed", () =>
      withEnv({ AWS_ACCESS_KEY_ID: "env-access-key", AWS_SECRET_ACCESS_KEY: "env-secret-key" }, async () => {
        createTransportMock.mockReturnValue(fakeTransporter());

        const mailer = new Mailer({ transport: TransportType.AMAZON_SES });

        await expect((mailer as any).sesClient.config.credentials()).resolves.toMatchObject({
          accessKeyId: "env-access-key",
          secretAccessKey: "env-secret-key",
        });
      }));

    it("throws when only one of the two AWS keys is provided", () => {
      expect(() => new Mailer({ transport: TransportType.AMAZON_SES, aws_access_key_id: "only-id" })).toThrow(
        "aws_access_key_id and aws_secret_access_key must be provided together"
      );
      expect(createTransportMock).not.toHaveBeenCalled();
    });

    it("throws on an unsupported transport type", () => {
      expect(() => new Mailer({ transport: "CARRIER_PIGEON" as TransportType })).toThrow(
        "Unsupported transport type: CARRIER_PIGEON"
      );
      expect(createTransportMock).not.toHaveBeenCalled();
    });

    it("does not create a transporter when no config is provided", () => {
      const mailer = new Mailer();

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

  describe("setTransporter", () => {
    it("allows overriding the transporter after construction", () => {
      const mailer = new Mailer();
      const transporter = fakeTransporter();

      mailer.setTransporter(transporter as unknown as nodemailer.Transporter);

      expect(mailer.transporter).toBe(transporter);
    });

    it("closes a transporter the Mailer created itself, but not an injected one", () => {
      const owned = fakeTransporter();
      createTransportMock.mockReturnValue(owned);
      const mailer = new Mailer({ transport: TransportType.SMTP, host: "h", port: 25 });

      const injected = fakeTransporter();
      mailer.setTransporter(injected as unknown as nodemailer.Transporter);
      expect(owned.close).toHaveBeenCalledTimes(1);

      mailer.setTransporter(fakeTransporter() as unknown as nodemailer.Transporter);
      expect(injected.close).not.toHaveBeenCalled();
    });
  });

  describe("close / verify", () => {
    it("closes the transporter", () => {
      const transporter = fakeTransporter();
      const mailer = new Mailer();
      mailer.setTransporter(transporter as unknown as nodemailer.Transporter);

      mailer.close();

      expect(transporter.close).toHaveBeenCalledTimes(1);
    });

    it("also destroys the SES client when configured for AMAZON_SES", () => {
      const transporter = fakeTransporter();
      createTransportMock.mockReturnValue(transporter);
      const mailer = new Mailer({ transport: TransportType.AMAZON_SES, aws_access_key_id: "k", aws_secret_access_key: "s" });
      const destroy = jest.spyOn((mailer as any).sesClient, "destroy").mockImplementation(() => {});

      mailer.close();

      expect(transporter.close).toHaveBeenCalledTimes(1);
      expect(destroy).toHaveBeenCalledTimes(1);
      expect((mailer as any).sesClient).toBeUndefined();
    });

    it("is a no-op when no transporter was created", () => {
      expect(() => new Mailer().close()).not.toThrow();
    });

    it("forwards verify() to the transporter", async () => {
      const transporter = fakeTransporter();
      const mailer = new Mailer();
      mailer.setTransporter(transporter as unknown as nodemailer.Transporter);

      await expect(mailer.verify()).resolves.toBe(true);
      expect(transporter.verify).toHaveBeenCalledTimes(1);
    });

    it("verify() throws when the transporter has not been initialized", async () => {
      await expect(new Mailer().verify()).rejects.toThrow("Transporter not initialized");
    });
  });

  describe("setStyle", () => {
    it("merges a partial style over the defaults", async () => {
      const mailer = new Mailer();
      mailer.setStyle({ mainColor: "#ABCDEF" });

      const html = await mailer.compose([{ type: EmailPartType.OneColText, title: "T", description: "D" }], companyInfo);

      expect(html).toContain('bgcolor="#F5F5F5"');
      expect(html).toContain("color: #ABCDEF");
    });
  });

  describe("send", () => {
    it("throws when the transporter has not been initialized", async () => {
      await expect(new Mailer().send("Subject", "from@example.com", ["to@example.com"], "<p>hi</p>")).rejects.toThrow(
        "Transporter not initialized"
      );
    });

    it("sends a plain email with the base fields, passing recipients as an array", async () => {
      const transporter = fakeTransporter();
      const mailer = new Mailer();
      mailer.setTransporter(transporter as unknown as nodemailer.Transporter);

      await mailer.send("Subject", "from@example.com", ["to1@example.com", "to2@example.com"], "<p>hi</p>");

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ["to1@example.com", "to2@example.com"],
          subject: "Subject",
          from: "from@example.com",
          html: "<p>hi</p>",
        })
      );
    });

    it.each([
      ["comma", "a@example.com, b@example.com"],
      ["semicolon", "a@example.com; b@example.com"],
      ["line break", "a@example.com\r\nBcc: c@example.com"],
      ["empty", "  "],
      ["non-string value", 42 as unknown as string],
    ])("rejects a recipient containing a %s without calling sendMail", async (_label, address) => {
      const transporter = fakeTransporter();
      const mailer = new Mailer();
      mailer.setTransporter(transporter as unknown as nodemailer.Transporter);

      await expect(mailer.send("S", "from@example.com", [address], "x")).rejects.toThrow("Invalid recipient address");
      expect(transporter.sendMail).not.toHaveBeenCalled();
    });

    it("attaches ical metadata as an icalEvent", async () => {
      const transporter = fakeTransporter();
      const mailer = new Mailer();
      mailer.setTransporter(transporter as unknown as nodemailer.Transporter);

      await mailer.send("Subject", "from@example.com", ["to@example.com"], "<p>hi</p>", { ical: "BEGIN:VCALENDAR..." });

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          icalEvent: expect.objectContaining({ method: "request", filename: "invitation.ics", content: "BEGIN:VCALENDAR..." }),
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
        expect.objectContaining({ text: "plain text body", attachments: [{ filename: "file.txt", content: "content" }] })
      );
    });

    it("returns the result of sendMail", async () => {
      const transporter = fakeTransporter();
      const mailer = new Mailer();
      mailer.setTransporter(transporter as unknown as nodemailer.Transporter);

      await expect(mailer.send("Subject", "from@example.com", ["to@example.com"], "<p>hi</p>")).resolves.toEqual({
        messageId: "abc-123",
      });
    });
  });

  describe("sendMulti", () => {
    it("throws when the transporter has not been initialized", async () => {
      await expect(new Mailer().sendMulti([])).rejects.toThrow("Transporter not initialized");
    });

    it("sends every message while the transporter is idle and reports the outcome", async () => {
      const transporter = fakeTransporter();
      const mailer = new Mailer();
      mailer.setTransporter(transporter as unknown as nodemailer.Transporter);
      const messages = [message("A"), message("B")];

      const result = await mailer.sendMulti(messages);

      expect(transporter.sendMail).toHaveBeenCalledTimes(2);
      expect(transporter.sendMail).toHaveBeenNthCalledWith(1, messages[0]);
      expect(result).toEqual({ sent: 2, failed: [], remaining: [] });
      expect(messages).toHaveLength(2);
    });

    it("stops once the transporter is no longer idle and returns the unsent messages", async () => {
      const transporter = fakeTransporter();
      transporter.isIdle.mockReturnValueOnce(true).mockReturnValueOnce(false);
      const mailer = new Mailer();
      mailer.setTransporter(transporter as unknown as nodemailer.Transporter);
      const messages = [message("A"), message("B")];

      const result = await mailer.sendMulti(messages);

      expect(transporter.sendMail).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ sent: 1, failed: [], remaining: [messages[1]] });
    });

    it("sends nothing when the transporter is busy from the start", async () => {
      const transporter = fakeTransporter();
      transporter.isIdle.mockReturnValue(false);
      const mailer = new Mailer();
      mailer.setTransporter(transporter as unknown as nodemailer.Transporter);
      const messages = [message("A")];

      await expect(mailer.sendMulti(messages)).resolves.toEqual({ sent: 0, failed: [], remaining: messages });
      expect(transporter.sendMail).not.toHaveBeenCalled();
    });

    it("records a failed message and keeps sending the rest", async () => {
      const transporter = fakeTransporter();
      const boom = new Error("boom");
      transporter.sendMail.mockResolvedValueOnce({}).mockRejectedValueOnce(boom).mockResolvedValueOnce({});
      const mailer = new Mailer();
      mailer.setTransporter(transporter as unknown as nodemailer.Transporter);
      const messages = [message("A"), message("B"), message("C")];

      const result = await mailer.sendMulti(messages);

      expect(transporter.sendMail).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ sent: 2, failed: [{ message: messages[1], error: boom }], remaining: [] });
    });

    it("wraps non-Error rejections into an Error", async () => {
      const transporter = fakeTransporter();
      transporter.sendMail.mockRejectedValueOnce("plain string failure");
      const mailer = new Mailer();
      mailer.setTransporter(transporter as unknown as nodemailer.Transporter);

      const result = await mailer.sendMulti([message("A")]);

      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toBeInstanceOf(Error);
      expect(result.failed[0].error.message).toBe("plain string failure");
    });
  });

  describe("compose", () => {
    it("renders the email template with the company info", async () => {
      const html = await new Mailer().compose(
        [{ type: EmailPartType.OneColText, title: "Hello", description: "World" }],
        companyInfo
      );

      expect(html).toContain("<title>Acme Inc.</title>");
      expect(html).toContain("Acme Inc.");
      expect(html).toContain("123 Main St");
    });

    it("matches the snapshot for one part of every type", async () => {
      const mailer = new Mailer();
      mailer.setStyle(style);
      const emailParts: EmailPart[] = [
        { type: EmailPartType.Image, imageUrl: "https://example.com/hero.png", alt: "Hero" },
        { type: EmailPartType.BlockedImage, imageUrl: "https://example.com/blocked.png" },
        { type: EmailPartType.OneColText, title: "Welcome", description: "Some <b>HTML</b>", link: "https://example.com", linkTitle: "Go" },
        { type: EmailPartType.BgImageWithText, backgroundUrl: "https://example.com/bg.png", description: "Overlay" },
        { type: EmailPartType.TwoEvenColsXs, title: "Two", xsInvariate: true, rows: rows(3) },
        { type: EmailPartType.ThreeEvenColsXs, title: "Three", rows: [...rows(4), { imageUrl: "https://example.com/l.png", description: "Linked", link: "https://example.com/r", alt: "L" }] },
        { type: EmailPartType.ThumbnailText, direction: "left", imageUrl: "https://example.com/t.png", title: "Thumb", description: "Desc", link: "https://example.com/go", linkTitle: "Go now" },
        { type: EmailPartType.Border },
      ];

      const html = await mailer.compose(emailParts, { ...companyInfo, otherInfo: "VAT 123" });

      expect(html).toMatchSnapshot();
    });

    it("applies the configured style colors to bg_image_with_text and thumbnail_text parts", async () => {
      const mailer = new Mailer();
      mailer.setStyle(style);

      const html = await mailer.compose(
        [
          { type: EmailPartType.BgImageWithText, backgroundUrl: "https://example.com/bg.png", description: "Some text" },
          { type: EmailPartType.ThumbnailText, imageUrl: "https://example.com/thumb.png", title: "Title", description: "Description" },
        ],
        companyInfo
      );

      expect(html).toContain('bgcolor="#555555"');
      expect(html).toContain("color: #888888");
      expect(html).toContain("color: #444444;");
      expect(html).toContain("color:#333333;");
    });

    it("applies the configured style colors to two/three even cols parts", async () => {
      const mailer = new Mailer();
      mailer.setStyle(style);

      for (const type of [EmailPartType.TwoEvenColsXs, EmailPartType.ThreeEvenColsXs]) {
        const html = await mailer.compose([{ type, title: "Cols", rows: rows(2) }], companyInfo);

        expect(html).toContain("color:#333333;");
        expect(html).toContain("color: #444444;");
        expect(html).not.toMatch(/color:\s*;/);
      }
    });

    it.each([1, 2, 3, 4, 5, 6, 7])("renders every row exactly once in two/three even cols parts (%i rows)", async (count) => {
      const mailer = new Mailer();

      for (const type of [EmailPartType.TwoEvenColsXs, EmailPartType.ThreeEvenColsXs]) {
        const html = await mailer.compose([{ type, rows: rows(count) }], companyInfo);

        for (let i = 0; i < count; i++) {
          expect(html.match(new RegExp(`ROW${i}\\b`, "g"))).toHaveLength(1);
        }
      }
    });

    it("emits the xs-invariate class matching the responsive CSS when xsInvariate is set", async () => {
      const mailer = new Mailer();

      const withFlag = await mailer.compose([{ type: EmailPartType.TwoEvenColsXs, xsInvariate: true, rows: rows(2) }], companyInfo);
      const withoutFlag = await mailer.compose([{ type: EmailPartType.TwoEvenColsXs, rows: rows(2) }], companyInfo);

      expect(withFlag).toContain(".column-2.xs-invariate");
      expect(withFlag).toContain('class="column-2 xs-invariate"');
      expect(withoutFlag).not.toContain('xs-invariate"');
    });

    it("wraps a row image in a link when row.link is set", async () => {
      const html = await new Mailer().compose(
        [{ type: EmailPartType.TwoEvenColsXs, rows: [{ imageUrl: "https://example.com/i.png", description: "D", link: "https://example.com/r" }] }],
        companyInfo
      );

      expect(html).toContain('<a href="https://example.com/r"><img src="https://example.com/i.png"');
    });

    it("renders alt attributes, falling back to the title and then to an empty string", async () => {
      const html = await new Mailer().compose(
        [
          { type: EmailPartType.Image, imageUrl: "https://example.com/1.png", alt: "Explicit alt" },
          { type: EmailPartType.ThumbnailText, imageUrl: "https://example.com/2.png", title: "Thumb title", description: "D" },
          { type: EmailPartType.BlockedImage, imageUrl: "https://example.com/3.png" },
          { type: EmailPartType.TwoEvenColsXs, rows: [{ imageUrl: "https://example.com/4.png", description: "D", alt: "Row alt" }] },
        ],
        companyInfo
      );

      expect(html).toContain('alt="Explicit alt"');
      expect(html).toContain('alt="Thumb title"');
      expect(html).toContain('src="https://example.com/3.png" height="" alt=""');
      expect(html).toContain('alt="Row alt"');
      expect(html).not.toContain("alt_text");
    });

    it("renders a thumbnail part without description without template errors", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

      try {
        const html = await new Mailer().compose(
          [{ type: EmailPartType.ThumbnailText, imageUrl: "https://example.com/thumb.png", title: "Only title" }],
          companyInfo
        );

        expect(consoleError).not.toHaveBeenCalled();
        expect(html).toContain('src="https://example.com/thumb.png"');
        expect(html).toContain("Only title");
        expect(html).not.toContain("null");
      } finally {
        consoleError.mockRestore();
      }
    });

    it("renders the thumbnail CTA button with linkTitle, falling back to the link", async () => {
      const mailer = new Mailer();
      const base: EmailPart = { type: EmailPartType.ThumbnailText, imageUrl: "https://example.com/thumb.png", description: "Desc", link: "https://example.com/go" };

      const withTitle = await mailer.compose([{ ...base, linkTitle: "Go now" }], companyInfo);
      const withoutTitle = await mailer.compose([base], companyInfo);

      expect(withTitle).toContain('href="https://example.com/go"');
      expect(withTitle).toContain("Go now");
      expect(withoutTitle.split("https://example.com/go")).toHaveLength(3);
    });

    it("truncates long text through the twig 'truncate' filter", async () => {
      const longTitle = "A".repeat(120);
      const shortDescription = "short description";

      const html = await new Mailer().compose(
        [{ type: EmailPartType.ThumbnailText, imageUrl: "https://example.com/image.png", alt: "thumb", title: longTitle, description: shortDescription }],
        companyInfo
      );

      expect(html).toContain(">" + "A".repeat(88) + "...<");
      expect(html).not.toContain(longTitle);
      expect(html).toContain(shortDescription);
    });

    it("defaults the truncate filter length to 10 when no argument is passed", () => {
      const rendered = twig.twig({ data: "{{ text | truncate }}" }).render({ text: "this is a much longer string than ten characters" });

      expect(rendered).toBe("this is a ...");
    });

    it.each([
      ["emailParts[0].link", [{ type: EmailPartType.OneColText, description: "D", link: "javascript:alert(1)" }], companyInfo],
      ["emailParts[0].imageUrl", [{ type: EmailPartType.Image, imageUrl: "data:text/html;base64,AAAA" }], companyInfo],
      ["emailParts[0].backgroundUrl", [{ type: EmailPartType.BgImageWithText, backgroundUrl: "vbscript:x", description: "D" }], companyInfo],
      ["emailParts[0].rows[1].link", [{ type: EmailPartType.TwoEvenColsXs, rows: [...rows(1), { imageUrl: "https://x/i.png", description: "D", link: "JavaScript:void(0)" }] }], companyInfo],
      ["companyInfo.logoUrl", [], { ...companyInfo, logoUrl: "file:///etc/passwd" }],
    ] as Array<[string, EmailPart[], CompanyInfo]>)("rejects an unsupported URL scheme in %s", async (field, parts, company) => {
      await expect(new Mailer().compose(parts, company)).rejects.toThrow(`Unsupported URL scheme`);
      await expect(new Mailer().compose(parts, company)).rejects.toThrow(field);
    });

    it("accepts http, https, mailto, tel, cid and scheme-less URLs", async () => {
      const html = await new Mailer().compose(
        [
          { type: EmailPartType.OneColText, description: "D", link: "mailto:info@example.com" },
          { type: EmailPartType.OneColText, description: "D", link: "tel:+390000000" },
          { type: EmailPartType.Image, imageUrl: "cid:inline-image" },
          { type: EmailPartType.Image, imageUrl: "//cdn.example.com/relative.png" },
          { type: EmailPartType.Image, imageUrl: "images/local.png" },
        ],
        { ...companyInfo, logoUrl: "HTTPS://example.com/logo.png" }
      );

      expect(html).toContain('href="mailto:info@example.com"');
      expect(html).toContain('src="cid:inline-image"');
    });

    it("rejects when the template fails to render", async () => {
      twigMock.mockImplementationOnce(() => {
        throw new Error("template blew up");
      });

      await expect(new Mailer().compose([], companyInfo)).rejects.toThrow("template blew up");
    });
  });

  describe("generateCal", () => {
    it("renders an RFC 5545 invite with CRLF line endings", async () => {
      const ics = await new Mailer().generateCal({ ...event, description: "Quarterly sync" });
      const lines = ics.split("\r\n");

      expect(ics.endsWith("\r\n")).toBe(true);
      expect(ics).not.toMatch(/[^\r]\n/);
      expect(lines).toEqual(
        expect.arrayContaining([
          "BEGIN:VCALENDAR",
          "PRODID:-//MrApps//MrappsEmailNodeModule//EN",
          "METHOD:REQUEST",
          "DTSTART:20260101T090000Z",
          "DTEND:20260101T100000Z",
          'ORGANIZER;CN="Alice":mailto:alice@example.com',
          "UID:event-uid-1",
          "CREATED:20251231T000000Z",
          "LAST-MODIFIED:20260101T000000Z",
          "DESCRIPTION:Quarterly sync",
          "SUMMARY:Meeting",
          "END:VCALENDAR",
        ])
      );
      expect(ics).toContain('CN="bob@example.com";X-NUM-GUESTS=0:mailto:bob@example.com');
    });

    it("stamps DTSTAMP with the generation time rather than lastModified", async () => {
      const ics = await new Mailer().generateCal(event);
      const dtstamp = /DTSTAMP:(\d{8}T\d{6}Z)/.exec(ics)?.[1];

      expect(dtstamp).toBeDefined();
      expect(dtstamp).not.toBe(event.lastModified);
      expect(Math.abs(Date.now() - Date.parse(dtstamp!.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, "$1-$2-$3T$4:$5:$6Z")))).toBeLessThan(60_000);
    });

    it("escapes special characters in text values and strips quotes from parameters", async () => {
      const ics = await new Mailer().generateCal({
        ...event,
        uid: "a;b",
        title: "Meeting, with; comma\\slash",
        description: "line1\nline2\r\nline3",
        organizer: { name: 'Al "ice"\r\nATTENDEE:evil', email: "alice@example.com" },
      });

      expect(ics).toContain("UID:a\\;b");
      expect(ics).toContain("SUMMARY:Meeting\\, with\\; comma\\\\slash");
      expect(ics).toContain("DESCRIPTION:line1\\nline2\\nline3");
      expect(ics).toContain('ORGANIZER;CN="Al iceATTENDEE:evil":mailto:alice@example.com');
      expect(ics).not.toMatch(/^ATTENDEE:evil/m);
    });

    it("renders null/undefined values as empty strings in the ics filters", () => {
      const rendered = twig
        .twig({ data: "[{{ missing | ics_escape }}][{{ missing | ics_param }}][{{ nothing | ics_param }}]" })
        .render({ nothing: null });

      expect(rendered).toBe("[][][]");
    });

    it("folds lines longer than 75 octets and unfolds back to the original text", async () => {
      const description = "é".repeat(100) + " " + "x".repeat(100);
      const ics = await new Mailer().generateCal({ ...event, description });

      for (const line of ics.split("\r\n")) {
        expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
      }
      expect(ics.replace(/\r\n /g, "")).toContain(`DESCRIPTION:${description}`);
    });

    it("rejects when the template fails to render", async () => {
      twigMock.mockImplementationOnce(() => {
        throw new Error("ics template blew up");
      });

      await expect(new Mailer().generateCal(event)).rejects.toThrow("ics template blew up");
    });
  });
});
