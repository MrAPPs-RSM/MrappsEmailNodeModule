var Mailer = require('./../mailer');

module.exports.testSendFailNoConfig = function (test) {

    var mailer = new Mailer();

    mailer.sendMail()
        .then(function () {
            test.ok(false);
            test.done();
        })
        .catch(function (error) {
            test.equal(error, 'No config set');
            test.done();
        });
};

module.exports.testSendFailEmpty = function (test) {

    var mailer = new Mailer();

    var host = "ssl0.ovh.net";
    var port = 587;
    var user = "luca@mr-apps.com";
    var password = "Mr?APP2015s!30";

    mailer.setConfig(host, port, user, password);

    mailer.sendMail()
        .then(function () {
            test.ok(false);
            test.done();
        })
        .catch(function (error) {
            test.equal(error, 'Some params cannot be empty');
            test.done();
        });
};

module.exports.testSendOk = function (test) {

    var mailer = new Mailer();

    var host = "ssl0.ovh.net";
    var port = 587;
    var user = "luca@mr-apps.com";
    var password = "Mr?APP2015s!30";

    mailer.setConfig(host, port, user, password);

    var emailParts = [
        //Image
        {
            type: mailer.emailParts.Image,
            imageUrl: "http://placehold.it/600x300"
        },

        //One col text
        {
            type: mailer.emailParts.OneColText,
            title: "Welcome",
            description: "Maecenas sed ante pellentesque, posuere leo id, eleifend dolor. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Praesent laoreet malesuada cursus. Maecenas scelerisque congue eros eu posuere. Praesent in felis ut velit pretium lobortis rhoncus ut&nbsp;erat.",
            link: "http://www.google.it",
            linkTitle: "Go to website"
        },

        //Background Image with Text
        {
            type: mailer.emailParts.BgImageWithText,
            backgroundUrl: "http://placehold.it/600x230/AE3742/C3505B",
            description: "Maecenas sed ante pellentesque, posuere leo id, eleifend dolor. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Praesent laoreet malesuada cursus. Maecenas scelerisque congue eros eu posuere. Praesent in felis ut velit pretium lobortis rhoncus ut&nbsp;erat."
        },

        //Two even cols xs
        {
            type: mailer.emailParts.TwoEvenColsXs,
            title: "2 Columns title",
            xsInvariate: false,
            rows: [
                {
                    imageUrl: "http://placehold.it/270",
                    description: "Short description 1"
                },
                {
                    imageUrl: "http://placehold.it/270",
                    description: "Short description 1"
                },
                {
                    imageUrl: "http://placehold.it/270",
                    description: "Short description 1"
                }
            ]
        },

        //Three even cols xs
        {
            type: mailer.emailParts.ThreeEvenColsXs,
            title: "3 Columns title",
            rows: [
                {
                    imageUrl: "http://placehold.it/170",
                    description: "Short description 1"
                },
                {
                    imageUrl: "http://placehold.it/170",
                    description: "Short description 2"
                },
                {
                    imageUrl: "http://placehold.it/170",
                    description: "Short description 3"
                },
                {
                    imageUrl: "http://placehold.it/170",
                    description: "Short description 4"
                }
            ]
        },

        //Thumbnail text 1
        {
            type: mailer.emailParts.ThumbnailText,
            imageUrl: "http://placehold.it/170",
            title: "Maecenas sed ante pellentesque, posuere leo id",
            description: "Maecenas sed ante pellentesque, posuere leo id, eleifend dolor. Praesent laoreet malesuada cursus. Maecenas scelerisque congue eros eu posuere. Praesent in felis ut velit pretium lobortis rhoncus ut&nbsp;erat."
        },

        //Thumbnail text 2
        {
            type: mailer.emailParts.ThumbnailText,
            direction: "left",
            link: "http://www.google.it",
            linkTitle: "Go to website",
            imageUrl: "http://placehold.it/170",
            title: "Maecenas sed ante pellentesque, posuere leo id",
            description: "Maecenas sed ante pellentesque, posuere leo id, eleifend dolor. Praesent laoreet malesuada cursus. Maecenas scelerisque congue eros eu posuere. Praesent in felis ut velit pretium lobortis rhoncus ut&nbsp;erat."
        }
    ];
    var logoUrl = "http://placehold.it/200x50";
    var companyName = "Test company";
    var street = "Some street, 14A";

    mailer.sendMail(
        "Subject",
        user,
        ["damian@mr-apps.com"],
        emailParts,
        logoUrl,
        companyName,
        street
    )
        .then(function (info) {
            console.log('Message %s sent: %s', info.messageId, info.response);
            test.ok(true);
            test.done();
        })
        .catch(function (error) {
            test.equal(error, 'Some params cannot be empty');
            test.done();
        });
};
