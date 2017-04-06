var Mailer = require('./../mailer');

module.exports.testConfig = function (test) {

    var mailer = new Mailer();

    var host = "ssl0.ovh.net";
    var port = 587;
    var user = "luca@mr-apps.com";
    var password = "Mr?APP2015s!30";

    mailer.setConfig(host, port, user, password);

    var expected = {
        host: host,
        port: port,
        user: user,
        password: password
    };

    test.deepEqual(mailer.config, expected);
    test.done();
};

module.exports.testStyle = function (test) {

    var mailer = new Mailer();

    var style = {
        backgroundColor: "#9999CC",
        contentColor: "#CEE5E8",
        boldColor: "#000000",
        textColor: "#F2473F",
        mainColor: "#333333",
        mainColorHover: "#FFA812",
        textOnMainColor: "#FFFFFF"
    };

    mailer.setStyle(style);

    test.deepEqual(mailer.style, style);
    test.done();
};
