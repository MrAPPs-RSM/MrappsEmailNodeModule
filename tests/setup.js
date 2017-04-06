var Mailer = require('./../mailer');
var config = {
    host: "ssl0.ovh.net",
    port: 587,
    user: "luca@mr-apps.com",
    password: "Mr?APP2015s!30"
};

var mailer = new Mailer(config);

module.exports.testStyle = function (test) {

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
