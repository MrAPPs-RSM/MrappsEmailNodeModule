'use strict';

var twig = require('twig');
var nodemailer = require('nodemailer');

var Mailer = function (config) {

    if (config === undefined || !('host' in config
        && 'port' in config
        && 'user' in config
        && 'password' in config)) {
        throw "Invalid mailer configuration data";
    }

    /** Twig extension */
    twig.extendFilter("truncate", function (string, length) {
        return string.substring(0, length) + '...';
    });

    var mailer = {

        /**
         * Override default style
         *
         * @param style object
         * */
        setStyle: function (style) {
            mailer.style = style;
        },

        /**
         * Compose html email template
         *
         * @param emailParts array that contains email structure to compose
         * @param logoUrl absolute url of email logo
         * @param companyName
         * @param street
         * @param otherInfo
         *
         * @return Promise
         *
         */
        composeMail: function (emailParts, logoUrl, companyName, street, otherInfo) {

            return new Promise(function (resolve, reject) {

                if (emailParts === undefined || emailParts === null ||
                    logoUrl === undefined || logoUrl === null ||
                    companyName === undefined || companyName === null ||
                    street === undefined || street === null
                ) {
                    reject("Some params cannot be empty");
                } else {

                    twig.renderFile('./views/index.html.twig',
                        {
                            //Email style
                            backgroundColor: mailer.style.backgroundColor,
                            contentColor: mailer.style.contentColor,
                            boldColor: mailer.style.boldColor,
                            textColor: mailer.style.textColor,
                            mainColor: mailer.style.mainColor,
                            mainColorHover: mailer.style.mainColorHover,
                            textOnMainColor: mailer.style.textOnMainColor,
                            //Email data
                            logoUrl: logoUrl,
                            companyName: companyName,
                            street: street,
                            otherInfo: otherInfo,
                            emailParts: emailParts
                        },
                        function (error, html) {
                            if (error) {
                                reject(error);
                            } else {
                                resolve(html);
                            }
                        });
                }
            });
        },

        /**
         * Send email
         *
         * @param subject email Subject
         * @param from email Sender
         * @param to receivers
         * @param emailParts array that contains email structure to compose
         * @param logoUrl url absolute url of email logo
         * @param companyName
         * @param street
         * @param otherInfo
         *
         * @return Promise
         *
         */
        sendMail: function (subject, from, to, emailParts, logoUrl, companyName, street, otherInfo) {

            return new Promise(function (resolve, reject) {

                if (from === undefined || from === null ||
                    to === undefined || to === null ||
                    emailParts === undefined || emailParts === null ||
                    logoUrl === undefined || logoUrl === null ||
                    companyName === undefined || companyName === null ||
                    street === undefined || street === null
                ) {
                    reject("Some params cannot be empty");
                }
                else {

                    mailer.composeMail(emailParts, logoUrl, companyName, street, otherInfo)
                        .then(function (body) {

                            /** Setup email data */
                            var mailOptions = {
                                from: from,
                                to: to.join(','),
                                subject: subject,
                                html: body
                            };

                            /** Send mail with defined transport object */
                            mailer.transport.sendMail(mailOptions, function (error, info) {

                                if (error) {
                                    reject(error);
                                } else {
                                    resolve(info);
                                }

                            });
                        })
                        .catch(function (error) {
                            reject(error);
                        });
                }
            });
        }
    };

    /** Supported email parts */
    mailer.emailParts = {
        BgImageWithText: "bg_image_with_text",
        TwoEvenColsXs: "two_even_cols_xs",
        ThreeEvenColsXs: "three_even_cols_xs",
        Image: "image",
        OneColText: "one_col_text",
        ThumbnailText: "thumbnail_text"
    };

    /** Default style */
    mailer.style = {
        backgroundColor: "#F5F5F5",
        contentColor: "#FFFFFF",
        boldColor: "#000000",
        textColor: "#555555",
        mainColor: "#333333",
        mainColorHover: "#000000",
        textOnMainColor: "#FFFFFF"
    };

    /** Creating SMTP transport */
    mailer.config = config;
    mailer.transport = nodemailer.createTransport(
        {
            host: mailer.config.host,
            port: mailer.config.port,
            auth: {
                user: mailer.config.user,
                pass: mailer.config.password
            }
        }
    );

    return mailer;
};


//Exporting the module
module.exports = Mailer;