# MrApps Email NodeModule

Email handler for node.js

## Requirements:

- Node.js v6+

## Installation:

## Usage:

```javascript
var Mailer = require('mrapps-email-module'),
	mailer = new Mailer();

mailer.setup(service, email, password);

mailer.sendMail(subject, from, to, emailParts, logoUrl, companyName, street, otherInfo)
	.then(function( result ) {
		//Mail sent
	})
	.catch(function( error ) {
		console.log(error);
	})
```
