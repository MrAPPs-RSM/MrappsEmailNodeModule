# MrApps Email NodeModule

Email handler for node.js

## Requirements:

- Node.js v6+

## Installation:

```bash
npm install --save git+https://git@github.com/MrAPPs-RSM/MrappsEmailNodeModule
```

or

```bash
npm install --save git+ssh://git@github.com/MrAPPs-RSM/MrappsEmailNodeModule
```


## Usage:

First, create a configuration file with the following parameters
```json
{
  "host": "host_name",
  "port": "host_port",
  "user": "user_email",
  "password": "user_password"
}
```

And then pass the config object to the constructor

```javascript
var Mailer = require('mrapps-mailer');
var mailer = new Mailer(config);
```

## Example:

```javascript
var mailer = new Mailer(config.mailer);

//Optional (to override template colors)
var style = {
    backgroundColor: "#F5F5F5",
    contentColor: "#FFFFFF",
    boldColor: "#000000",
    textColor: "#555555",
    mainColor: "#333333",
    mainColorHover: "#000000",
    textOnMainColor: "#FFFFFF"
};

mailer.setStyle(style);

//Examples for every supported html part of mailer
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
            //...
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
            //...
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

mailer.sendMail(
    "Subject",
     "email@sender.com",
     ["first@receiver.com","second@receiver.com"],
     emailParts,
     "http://placehold.it/200x50",
     "Test company",
     "Some street, 14A"
)
    .then(function (info) {
        console.log('Message %s sent: %s', info.messageId, info.response);
    })
    .catch(function (error) {
        console.log(error);
    });
```

## Test:

### Requirements:

- [nodeunit](https://github.com/caolan/nodeunit)

### Run tests:

```bash
npm test
```
