# MrApps Email NodeModule

Email handler for node.js

## Requirements:

- Node.js v6+

## Installation:

## Usage:

```javascript
var Mailer = require('mrapps-email-module');
var mailer = new Mailer();

//Required
mailer.setConfig(host, port, user, password);

//Optional (to override template colors)
mailer.setStyle(style);

mailer.sendMail(
    subject,
    from,
    to,
    emailParts,
    logoUrl,
    companyName,
    street,
    otherInfo
)
    .then(function (info) {
        console.log('Message %s sent: %s', info.messageId, info.response);
     })
     .catch(function (error) {
        console.log(error);
     })
```

## Test:

### Requirements:

- [nodeunit](https://github.com/caolan/nodeunit)

### Run tests:

```bash
npm test
```
