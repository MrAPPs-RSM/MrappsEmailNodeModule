module.exports.testMail = function (test) {

    var Mailer = require('./../index');

    var mailer = new Mailer();

    mailer.composeMail(
        [],
        "http://placehold.it/200x50",
        "Company name",
        "Street",
        "Other info"
    )
        .then(function (data) {
            console.log(data);
            test.ok(true);
            test.done();
        })
        .catch(function (error) {
            test.ok(false, JSON.stringify(error));
            test.done();
        });
};