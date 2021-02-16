import * as nodemailer from 'nodemailer';
import * as twig from 'twig';
import path from 'path';
import { EventAttributes, createEvent } from 'ics';

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

export interface EmailMetadata {
    ical?: string;
}

export class Mailer {
    public transporter: nodemailer.Transporter;

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

    constructor(config: Configuration) {
        // Inizialize SMTP transporter
        this.transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            auth: {
                type: 'login',
                user: config.user,
                pass: config.password
            }
        });

        // Twig extension
        twig.extendFilter('truncate', (string: string, length: number) => {
            return string.substring(0, length) + '...';
        })
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

    async generateCal(data: EventAttributes): Promise<string> {
        return new Promise((resolve, reject) => {
            createEvent(data, (error, value) => {
                if (error) reject(error);

                resolve(value);
            })
        });
    }

    async send(subject: string, from: string, to: Array<string>, html: any, metadata?: EmailMetadata): Promise<nodemailer.SentMessageInfo> {
        const options: nodemailer.SendMailOptions = {
            to: to.join(','),
            icalEvent: metadata?.ical,
            subject,
            from,
            html,
        }

        const info: nodemailer.SentMessageInfo = await this.transporter.sendMail(options);

        return info;
    }
}