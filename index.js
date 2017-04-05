'use strict';

var twig = require('twig');
var nodemailer = require('nodemailer');

var settings = {
    parts: {
        BgImageWithText: "bg_image_with_text",
        TwoEvenColsXs: "two_even_cols_xs",
        ThreeEvenColsXs: "three_even_cols_xs",
        Image: "image",
        OneColText: "one_col_text",
        ThumbnailText: "thumbnail_text"
    }
};

var Mailer = function () {

    var mailer = {

        auth: {
            service: '', //gmail, hotmail...
            email: '', //sender email
            password: '' //sender password
        },

        /**
         * Default styles
         */
        styles: {
            backgroundColor: "#F5F5F5",
            contentColor: "#FFFFFF",
            boldColor: "#000000",
            textColor: "#555555",
            mainColor: "#333333",
            mainColorHover: "#000000",
            textOnMainColor: "#FFFFFF"
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

                if (emailParts === null ||
                    logoUrl === null ||
                    companyName === null ||
                    street === null
                ) {
                    reject();
                } else {

                    twig.renderFile('./views/index.html.twig',
                        {
                            //Email style
                            backgroundColor: mailer.styles.backgroundColor,
                            contentColor: mailer.styles.contentColor,
                            boldColor: mailer.styles.boldColor,
                            textColor: mailer.styles.textColor,
                            mainColor: mailer.styles.mainColor,
                            mainColorHover: mailer.styles.mainColorHover,
                            textOnMainColor: mailer.styles.textOnMainColor,
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

                if (from === null ||
                    to === null ||
                    emailParts === null ||
                    logoUrl === null ||
                    companyName === null ||
                    street === null
                ) {
                    reject();
                }
                else {

                    mailer.composeMail(emailParts, logoUrl, companyName, street, otherInfo)
                        .then(function (body) {

                            /** Setup email data with unicode symbols */
                            var mailOptions = {
                                from: from,
                                to: to.join(','),
                                subject: subject,
                                html: body
                            };

                            mailer.transport = nodemailer.createTransport("SMTP", {
                                service: mailer.service,
                                auth: {
                                    user: mailer.email,
                                    pass: mailer.password
                                }
                            });

                            /** Send mail with defined transport object */
                            mailer.transport.sendMail(mailOptions, function (error, info) {

                                if (error) {
                                    return error;
                                } else {
                                    console.log('Message %s sent: %s', info.messageId, info.response);
                                    return true;
                                }

                            });
                        })
                        .catch(function (error) {
                            reject(error);
                        });


                }
            });
        },

        /** Shut down the connection pool, no more messages. */
        closeTransport: function () {
            mailer.transport.close();
        }
    };

    return mailer;
};


//Exporting the module
module.exports = Mailer;