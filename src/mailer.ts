import * as nodemailer from "nodemailer";
import * as twig from "twig";
import path from "path";
import { Readable } from "stream";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

export enum TransportType {
  SMTP = "SMTP",
  AMAZON_SES = "AMAZON_SES",
}
export class Configuration {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  aws_source_address?: string;
  aws_access_key_id?: string;
  aws_secret_access_key?: string;
  aws_region?: string = "eu-west-1";
  transport?: TransportType = TransportType.SMTP;
}

export type Style = {
  backgroundColor: string;
  contentColor: string;
  boldColor: string;
  textColor: string;
  mainColor: string;
  mainButtonColor: string;
  mainColorHover: string;
  textOnMainColor: string;
};

export enum EmailPartType {
  BgImageWithText = "bg_image_with_text",
  TwoEvenColsXs = "two_even_cols_xs",
  ThreeEvenColsXs = "three_even_cols_xs",
  BlockedImage = "blocked_image",
  Image = "image",
  OneColText = "one_col_text",
  ThumbnailText = "thumbnail_text",
  Border = "border",
}

export type EmailPartDirection = "left" | "right";

export type EmailPartRow = {
  imageUrl: string;
  description: string;
  link?: string;
  alt?: string;
};

export interface EmailPart {
  type: EmailPartType;
  imageUrl?: string;
  alt?: string;
  title?: string;
  description?: string;
  direction?: EmailPartDirection;
  link?: string;
  linkTitle?: string;
  backgroundUrl?: string;
  xsInvariate?: boolean;
  rows?: Array<EmailPartRow>;
}

export interface CompanyInfo {
  logoUrl: string;
  companyName: string;
  street: string;
  otherInfo?: string;
}

export interface EventAttribute {
  start: string;
  end: string;
  uid: string;
  created: string;
  lastModified: string;
  title: string;
  description?: string;
  organizer: {
    name: string;
    email: string;
  };
  partecipant: {
    email: string;
  };
}

interface AttachmentLike {
  content?: string | Buffer | Readable;
  path?: string;
}

export interface EmailAttachment extends AttachmentLike {
  filename?: string | false;
  cid?: string;
  encoding?: string;
  contentType?: string;
  contentTransferEncoding?: "7bit" | "base64" | "quoted-printable" | false;
  contentDisposition?: "attachment" | "inline";
  headers?: nodemailer.Headers;
  raw?: string | Buffer | Readable | AttachmentLike;
}

export interface EmailMetadata {
  ical?: string;
  text?: string;
  attachments?: EmailAttachment[];
}

export interface EmailMessage {
  subject: string;
  from: string;
  to: Array<string>;
  html: string;
  metadata?: EmailMetadata;
}

export interface SendMultiFailure {
  message: EmailMessage;
  error: Error;
}

export interface SendMultiResult {
  sent: number;
  failed: SendMultiFailure[];
  remaining: EmailMessage[];
}

const DEFAULT_AWS_REGION = "eu-west-1";
const DEFAULT_TRUNCATE_LENGTH = 10;
const ALLOWED_URL_SCHEMES = new Set(["http", "https", "mailto", "tel", "cid"]);
const ICS_MAX_LINE_OCTETS = 75;

twig.extendFilter("truncate", (value: unknown, params: false | any[]) => {
  const text = value == null ? "" : String(value);
  const length =
    Array.isArray(params) && params.length > 0 ? params[0] : DEFAULT_TRUNCATE_LENGTH;
  return text.length > length ? text.substring(0, length) + "..." : text;
});

// RFC 5545 §3.3.11: escape backslash, semicolon, comma and line breaks in TEXT values.
twig.extendFilter("ics_escape", (value: unknown) =>
  (value == null ? "" : String(value))
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n")
);

// RFC 5545 §3.2: parameter values are always emitted quoted, so only DQUOTE and control characters are illegal.
twig.extendFilter("ics_param", (value: unknown) =>
  (value == null ? "" : String(value)).replace(/["\x00-\x1f\x7f]/g, "")
);

function assertSafeUrl(value: string | undefined, field: string): void {
  if (!value) {
    return;
  }
  const match = /^\s*([a-z][a-z0-9+.-]*):/i.exec(value);
  if (match && !ALLOWED_URL_SCHEMES.has(match[1].toLowerCase())) {
    throw new Error(`Unsupported URL scheme "${match[1]}" in ${field}`);
  }
}

function assertRecipient(address: string): void {
  if (typeof address !== "string" || address.trim() === "" || /[,;\r\n]/.test(address)) {
    throw new Error(`Invalid recipient address: ${JSON.stringify(address)}`);
  }
}

function icsTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function foldIcsLine(line: string): string {
  const out: string[] = [];
  let current = "";
  let octets = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char);
    // continuation lines start with a space, which costs one octet
    const limit = out.length === 0 ? ICS_MAX_LINE_OCTETS : ICS_MAX_LINE_OCTETS - 1;
    if (octets + size > limit) {
      out.push(current);
      current = "";
      octets = 0;
    }
    current += char;
    octets += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

export class Mailer {
  public transporter?: nodemailer.Transporter;
  private sesClient?: SESv2Client;
  private ownsTransporter = false;
  private sourceAddress: string = "";

  private style: Style = {
    backgroundColor: "#F5F5F5",
    contentColor: "#FFFFFF",
    boldColor: "#000000",
    textColor: "#555555",
    mainColor: "#333333",
    mainButtonColor: "#333333",
    mainColorHover: "#000000",
    textOnMainColor: "#FFFFFF",
  };

  constructor(config?: Configuration) {
    if (!config) {
      return;
    }

    const transport = config.transport ?? TransportType.SMTP;

    if (transport === TransportType.SMTP) {
      this.sourceAddress = config.user ?? "";
      this.transporter = nodemailer.createTransport({
        pool: true,
        host: config.host,
        port: config.port,
        auth: {
          type: "login",
          user: config.user ?? "",
          pass: config.password ?? "",
        },
      });
    } else if (transport === TransportType.AMAZON_SES) {
      this.sourceAddress = config.aws_source_address ?? "";
      const accessKeyId = config.aws_access_key_id;
      const secretAccessKey = config.aws_secret_access_key;
      if ((accessKeyId === undefined) !== (secretAccessKey === undefined)) {
        throw new Error(
          "aws_access_key_id and aws_secret_access_key must be provided together"
        );
      }

      // Without explicit credentials the SDK's default provider chain applies
      // (env vars, shared config, ECS/EC2/IAM roles).
      this.sesClient = new SESv2Client({
        region: config.aws_region ?? DEFAULT_AWS_REGION,
        ...(accessKeyId !== undefined && secretAccessKey !== undefined
          ? { credentials: { accessKeyId, secretAccessKey } }
          : {}),
      });

      this.transporter = nodemailer.createTransport({
        SES: { sesClient: this.sesClient, SendEmailCommand },
      });
    } else {
      throw new Error(`Unsupported transport type: ${String(transport)}`);
    }

    this.ownsTransporter = true;
  }

  setTransporter(transporter: nodemailer.Transporter) {
    if (this.ownsTransporter) {
      this.close();
    }
    this.transporter = transporter;
    this.ownsTransporter = false;
  }

  close(): void {
    this.transporter?.close();
    this.sesClient?.destroy();
    this.sesClient = undefined;
  }

  async verify(): Promise<true> {
    if (!this.transporter) {
      throw new Error("Transporter not initialized");
    }
    return this.transporter.verify();
  }

  setStyle(style: Partial<Style>): void {
    this.style = { ...this.style, ...style };
  }

  async compose(
    emailParts: Array<EmailPart>,
    companyInfo: CompanyInfo
  ): Promise<string> {
    assertSafeUrl(companyInfo.logoUrl, "companyInfo.logoUrl");
    emailParts.forEach((part, index) => {
      assertSafeUrl(part.imageUrl, `emailParts[${index}].imageUrl`);
      assertSafeUrl(part.link, `emailParts[${index}].link`);
      assertSafeUrl(part.backgroundUrl, `emailParts[${index}].backgroundUrl`);
      part.rows?.forEach((row, rowIndex) => {
        assertSafeUrl(row.imageUrl, `emailParts[${index}].rows[${rowIndex}].imageUrl`);
        assertSafeUrl(row.link, `emailParts[${index}].rows[${rowIndex}].link`);
      });
    });

    return this.renderTemplate("../views/index.html.twig", {
      settings: {
        ...this.style,
        logoUrl: companyInfo.logoUrl,
        companyName: companyInfo.companyName,
        street: companyInfo.street,
        otherInfo: companyInfo.otherInfo,
        emailParts,
      },
    });
  }

  async generateCal(data: EventAttribute): Promise<string> {
    const rendered = this.renderTemplate("../views/parts/ical_file.ics.twig", {
      settings: { ...data, dtstamp: icsTimestamp(new Date()) },
    });

    return rendered
      .split(/\r?\n/)
      .filter((line) => line !== "")
      .map(foldIcsLine)
      .join("\r\n")
      .concat("\r\n");
  }

  async send(
    subject: string,
    from: string,
    to: Array<string>,
    html: string,
    metadata?: EmailMetadata
  ): Promise<nodemailer.SentMessageInfo> {
    if (!this.transporter) {
      throw new Error("Transporter not initialized");
    }

    to.forEach(assertRecipient);

    let options: nodemailer.SendMailOptions = {
      to,
      subject,
      sender: this.sourceAddress,
      from: from,
      html,
    };

    if (metadata?.ical) {
      options = {
        ...options,
        icalEvent: {
          method: "request",
          filename: "invitation.ics",
          content: metadata.ical,
        },
      };
    }

    if (metadata?.text) {
      options = {
        ...options,
        text: metadata.text,
      };
    }

    if (metadata?.attachments) {
      options = {
        ...options,
        attachments: metadata.attachments,
      };
    }
    return await this.transporter.sendMail(options);
  }

  async sendMulti(messages: EmailMessage[]): Promise<SendMultiResult> {
    if (!this.transporter) {
      throw new Error("Transporter not initialized");
    }

    const result: SendMultiResult = { sent: 0, failed: [], remaining: [] };
    let index = 0;

    // Send next while the pooled transport reports a free connection
    while (index < messages.length && this.transporter.isIdle()) {
      const message = messages[index];
      try {
        await this.transporter.sendMail(message);
        result.sent++;
      } catch (error) {
        result.failed.push({
          message,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
      index++;
    }

    result.remaining = messages.slice(index);
    return result;
  }

  private renderTemplate(relativePath: string, context: Record<string, unknown>): string {
    const params: twig.Parameters & { rethrow: boolean } = {
      path: path.resolve(__dirname, relativePath),
      async: false,
      rethrow: true,
    };
    return String(twig.twig(params).render(context));
  }
}
