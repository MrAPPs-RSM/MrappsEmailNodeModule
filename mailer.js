'use strict';

var twig = require('twig');
var nodemailer = require('nodemailer');

var Mailer = function () {

    /** Twig extension */
    twig.extendFilter("truncate", function (string, length) {
        return string.substring(0, length) + '...';
    });

    var mailer = {

        /** Supported email parts */
        emailParts: {
            BgImageWithText: "bg_image_with_text",
            TwoEvenColsXs: "two_even_cols_xs",
            ThreeEvenColsXs: "three_even_cols_xs",
            Image: "image",
            OneColText: "one_col_text",
            ThumbnailText: "thumbnail_text"
        },

        /** Default styles */
        style: {
            backgroundColor: "#F5F5F5",
            contentColor: "#FFFFFF",
            boldColor: "#000000",
            textColor: "#555555",
            mainColor: "#333333",
            mainColorHover: "#000000",
            textOnMainColor: "#FFFFFF"
        },

        config: {},
        transport: {},

        /**
         * Setup base params for SMTP
         *
         * @param host
         * @param port
         * @param user
         * @param password
         */
        setConfig: function (host, port, user, password) {
            mailer.config.host = host;
            mailer.config.port = port;
            mailer.config.user = user;
            mailer.config.password = password;
        },

        /** Override default style
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

                //If no setup
                if (Object.keys(mailer.config).length === 0) {
                    reject("No config set");
                } else {

                    if (from === null ||
                        to === null ||
                        emailParts === null ||
                        logoUrl === null ||
                        companyName === null ||
                        street === null
                    ) {
                        reject("Some params cannot be empty");
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