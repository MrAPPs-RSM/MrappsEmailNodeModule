import * as nodemailer from 'nodemailer';
import * as twig from 'twig';
import path from 'path';
import { Readable } from 'stream';

export type Configuration = {
    host: string;
    port: number;
    user: string;
    password: string;
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
}

export enum EmailPartType {
    BgImageWithText = "bg_image_with_text",
    TwoEvenColsXs = "two_even_cols_xs",
    ThreeEvenColsXs = "three_even_cols_xs",
    BlockedImage = 'blocked_image',
    Image = "image",
    OneColText = "one_col_text",
    ThumbnailText = "thumbnail_text",
    Border = 'border'
}

export type EmailPartRow = {
    imageUrl: string;
    description: string;
}

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
    }
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
}

export interface EmailMessage {
    subject: string;
    from: string;
    to: Array<string>;
    html: any;
    metadata?: EmailMetadata
}

export class Mailer {
    public transporter?: nodemailer.Transporter;

    private style: Style = {
        backgroundColor: "#F5F5F5",
        contentColor: "#FFFFFF",
        boldColor: "#000000",
        textColor: "#555555",
        mainColor: "#333333",
        mainButtonColor: '#333333',
        mainColorHover: "#000000",
        textOnMainColor: "#FFFFFF"
    }

    constructor(config?: Configuration) {
        if (config) {
            // Inizialize SMTP transporter
            this.transporter = nodemailer.createTransport({
                pool: true,
                host: config.host,
                port: config.port,
                auth: {
                    type: 'login',
                    user: config.user,
                    pass: config.password
                },
            });
        }

        // Twig extension
        twig.extendFilter('truncate', (string: string, length: number) => {
            return string.substring(0, length) + '...';
        })
    }

    public setTransporter(transporter: nodemailer.Transporter) {
        this.transporter = transporter;
    }

    setStyle(style: Style): void {
        this.style = style;
    }

    compose(emailParts: Array<EmailPart>, companyInfo: CompanyInfo): Promise<any> {
        return new Promise((resolve, reject) => {
            twig.renderFile(path.resolve(__dirname, '../views/index.html.twig'), {
                filename: 'index.html.twig',
                settings: {
                    //Email style
                    backgroundColor: this.style.backgroundColor,
                    contentColor: this.style.contentColor,
                    boldColor: this.style.boldColor,
                    textColor: this.style.textColor,
                    mainColor: this.style.mainColor,
                    mainButtonColor: this.style.mainButtonColor,
                    mainColorHover: this.style.mainColorHover,
                    textOnMainColor: this.style.textOnMainColor,
                    //Email data
                    logoUrl: companyInfo.logoUrl,
                    companyName: companyInfo.companyName,
                    street: companyInfo.street,
                    otherInfo: companyInfo.otherInfo,
                    emailParts: emailParts
                }
            }, (err: Error, html: any) => {
                if (err) {
                    reject(err);
                }

                resolve(html);
            })
        })
    }

    async generateCal(data: EventAttribute): Promise<string> {
        return new Promise((resolve, reject) => {
            twig.renderFile(path.resolve(__dirname, '../views/parts/ical_file.ics.twig'), {
                filename: 'ical_file.ics.twig',
                settings: data
            }, (err: Error, html: any) => {
                if (err) {
                    reject(err);
                }

                resolve(html);
            })
        });
    }

    async send(subject: string, from: string, to: Array<string>, html: any, metadata?: EmailMetadata): Promise<nodemailer.SentMessageInfo> {
        if (!this.transporter) {
            throw new Error('Transporter not initialized');
        }

        let options: nodemailer.SendMailOptions = {
            to: to.join(','),
            subject,
            from,
            html,
        }

        if (metadata?.ical) {
            options = {
                ...options,
                icalEvent: {
                    method: 'request',
                    filename: 'invitation.ics',
                    content: metadata.ical
                }
            }
        }

        if (metadata?.text) {
            options = {
                ...options,
                text: metadata.text
            }
        }

        if (metadata?.attachments) {
            options = {
                ...options,
                attachments: metadata.attachments
            }
        }

        return await this.transporter.sendMail(options);
    }

    async sendMulti(messages: EmailMessage[]): Promise<void> {
        if (!this.transporter) {
            throw new Error('Transporter not initialized');
        }
        
        // Send next when transporter is ready
        while (this.transporter.isIdle() && messages.length > 0) {
            await this.transporter.sendMail(messages[0]);
            messages.shift();
        }
    }
}