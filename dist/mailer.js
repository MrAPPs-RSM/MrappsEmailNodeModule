"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mailer = exports.EmailPartType = void 0;
const nodemailer = __importStar(require("nodemailer"));
const twig = __importStar(require("twig"));
const path_1 = __importDefault(require("path"));
var EmailPartType;
(function (EmailPartType) {
    EmailPartType["BgImageWithText"] = "bg_image_with_text";
    EmailPartType["TwoEvenColsXs"] = "two_even_cols_xs";
    EmailPartType["ThreeEvenColsXs"] = "three_even_cols_xs";
    EmailPartType["BlockedImage"] = "blocked_image";
    EmailPartType["Image"] = "image";
    EmailPartType["OneColText"] = "one_col_text";
    EmailPartType["ThumbnailText"] = "thumbnail_text";
    EmailPartType["Border"] = "border";
})(EmailPartType = exports.EmailPartType || (exports.EmailPartType = {}));
class Mailer {
    constructor(config) {
        this.style = {
            backgroundColor: "#F5F5F5",
            contentColor: "#FFFFFF",
            boldColor: "#000000",
            textColor: "#555555",
            mainColor: "#333333",
            mainButtonColor: '#333333',
            mainColorHover: "#000000",
            textOnMainColor: "#FFFFFF"
        };
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
        // twig.extendFilter('truncate', (string: string, length: number[]) => {})
        // twig.extendFilter('truncate', (string: string, length: number) => {
        //     return string.substring(0, length) + '...';
        // })
    }
    setTransporter(transporter) {
        this.transporter = transporter;
    }
    setStyle(style) {
        this.style = style;
    }
    compose(emailParts, companyInfo) {
        return new Promise((resolve, reject) => {
            twig.renderFile(path_1.default.resolve(__dirname, '../views/index.html.twig'), {
                filename: 'index.html.twig',
                // settings: {
                //     //Email style
                // }
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
            }, (err, html) => {
                if (err) {
                    reject(err);
                }
                resolve(html);
            });
        });
    }
    generateCal(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                twig.renderFile(path_1.default.resolve(__dirname, '../views/parts/ical_file.ics.twig'), Object.assign({ filename: 'ical_file.ics.twig' }, data), (err, html) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(html);
                });
            });
        });
    }
    send(subject, from, to, html, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.transporter) {
                throw new Error('Transporter not initialized');
            }
            let options = {
                to: to.join(','),
                subject,
                from,
                html,
            };
            if (metadata === null || metadata === void 0 ? void 0 : metadata.ical) {
                options = Object.assign(Object.assign({}, options), { icalEvent: {
                        method: 'request',
                        filename: 'invitation.ics',
                        content: metadata.ical
                    } });
            }
            if (metadata === null || metadata === void 0 ? void 0 : metadata.text) {
                options = Object.assign(Object.assign({}, options), { text: metadata.text });
            }
            if (metadata === null || metadata === void 0 ? void 0 : metadata.attachments) {
                options = Object.assign(Object.assign({}, options), { attachments: metadata.attachments });
            }
            return yield this.transporter.sendMail(options);
        });
    }
    sendMulti(messages) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.transporter) {
                throw new Error('Transporter not initialized');
            }
            // Send next when transporter is ready
            while (this.transporter.isIdle() && messages.length > 0) {
                yield this.transporter.sendMail(messages[0]);
                messages.shift();
            }
        });
    }
}
exports.Mailer = Mailer;
//# sourceMappingURL=mailer.js.map