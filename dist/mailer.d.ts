/// <reference types="node" />
/// <reference types="node" />
import * as nodemailer from 'nodemailer';
import { Readable } from 'stream';
export declare type Configuration = {
    host: string;
    port: number;
    user: string;
    password: string;
};
export declare type Style = {
    backgroundColor: string;
    contentColor: string;
    boldColor: string;
    textColor: string;
    mainColor: string;
    mainButtonColor: string;
    mainColorHover: string;
    textOnMainColor: string;
};
export declare enum EmailPartType {
    BgImageWithText = "bg_image_with_text",
    TwoEvenColsXs = "two_even_cols_xs",
    ThreeEvenColsXs = "three_even_cols_xs",
    BlockedImage = "blocked_image",
    Image = "image",
    OneColText = "one_col_text",
    ThumbnailText = "thumbnail_text",
    Border = "border"
}
export declare type EmailPartRow = {
    imageUrl: string;
    description: string;
};
export interface EmailPart {
    type: EmailPartType;
    imageUrl?: string;
    title?: string;
    description?: string;
    direction?: string;
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
export interface EmailOption {
    subject: string;
    from: string;
    to: Array<string>;
    html: any;
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
    contentTransferEncoding?: '7bit' | 'base64' | 'quoted-printable' | false;
    contentDisposition?: 'attachment' | 'inline';
    headers?: any;
    raw?: string | Buffer | Readable | AttachmentLike;
}
export interface EmailMetadata {
    ical?: string;
    text?: string;
    attachments?: EmailAttachment[];
    resolveHostname?: string;
}
export interface EmailMessage {
    subject: string;
    from: string;
    to: Array<string>;
    html: any;
    metadata?: EmailMetadata;
}
export declare class Mailer {
    transporter?: nodemailer.Transporter;
    private mxResolver;
    private config?;
    private style;
    constructor(config?: Configuration);
    setTransporter(transporter: nodemailer.Transporter): void;
    private applyConfig;
    setStyle(style: Style): void;
    compose(emailParts: Array<EmailPart>, companyInfo: CompanyInfo): Promise<any>;
    generateCal(data: EventAttribute): Promise<string>;
    send(subject: string, from: string, to: Array<string>, html: any, metadata?: EmailMetadata): Promise<nodemailer.SentMessageInfo>;
    sendMulti(messages: EmailMessage[]): Promise<void>;
}
export {};
//# sourceMappingURL=mailer.d.ts.map