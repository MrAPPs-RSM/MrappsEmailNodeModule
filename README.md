# MrApps Email NodeModule

Email handler for Typescript

## Requirements:

- Typescript +3.9.7

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
import {Mailer, EmailPart, EmailPartType} from 'mrapps-mailer';
const mailer = new Mailer(config);
```

## Example:

```javascript
const mailer = new Mailer({
  host: "host_name",
  port: "host_port",
  user: "user_email",
  password: "user_password"
});

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
const emailParts: Array<EmailPart> = [
    
    //Image
    {
        type: EmailPartType.Image,
        imageUrl: "http://placehold.it/600x300"
    },

    //One col text
    {
        type: EmailPartType.OneColText,
        title: "Welcome",
        description: "Maecenas sed ante pellentesque, posuere leo id, eleifend dolor. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Praesent laoreet malesuada cursus. Maecenas scelerisque congue eros eu posuere. Praesent in felis ut velit pretium lobortis rhoncus ut&nbsp;erat.",
        link: "http://www.google.it",
        linkTitle: "Go to website"
    },

    //Background Image with Text
    {
        type: EmailPartType.BgImageWithText,
        backgroundUrl: "http://placehold.it/600x230/AE3742/C3505B",
        description: "Maecenas sed ante pellentesque, posuere leo id, eleifend dolor. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Praesent laoreet malesuada cursus. Maecenas scelerisque congue eros eu posuere. Praesent in felis ut velit pretium lobortis rhoncus ut&nbsp;erat."
    },

    //Two even cols xs
    {
        type: EmailPartType.TwoEvenColsXs,
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
        type: EmailPartType.ThreeEvenColsXs,
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
        type: EmailPartType.ThumbnailText,
        imageUrl: "http://placehold.it/170",
        title: "Maecenas sed ante pellentesque, posuere leo id",
        description: "Maecenas sed ante pellentesque, posuere leo id, eleifend dolor. Praesent laoreet malesuada cursus. Maecenas scelerisque congue eros eu posuere. Praesent in felis ut velit pretium lobortis rhoncus ut&nbsp;erat."
    },

    //Thumbnail text 2
    {
        type: EmailPartType.ThumbnailText,
        direction: "left",
        link: "http://www.google.it",
        linkTitle: "Go to website",
        imageUrl: "http://placehold.it/170",
        title: "Maecenas sed ante pellentesque, posuere leo id",
        description: "Maecenas sed ante pellentesque, posuere leo id, eleifend dolor. Praesent laoreet malesuada cursus. Maecenas scelerisque congue eros eu posuere. Praesent in felis ut velit pretium lobortis rhoncus ut&nbsp;erat."
     }
];
const company: CompanyInfo = {
    companyName: 'Test Company',
    street: 'Via di qua, 12',
    logoUrl: 'http://placeholder.it/200x50'
}

// Compose HTML template
const html = await mailer.compose(emailParts, company);

// Send email with generated template
const result = await mailer.send('subject', 'from', ['to1', 'to2'], html);
```

## Test:

### Requirements:

- Mocha
- Chai

### Run tests:

```bash
npm test
```
