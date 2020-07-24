import * as mocha from 'mocha';
import * as chai from 'chai';
import * as fs from 'fs';

import { Mailer, CompanyInfo, EmailPart, EmailPartType } from '../src';

const expect = chai.expect;

describe('compose-mail', async () => {
    const mailer = new Mailer({
        host: '',
        port: 0,
        user: '',
        password: ''
    });

    // it('compose-fail', () => {
    //     mailer.compose([], {} as CompanyInfo)
    //         .catch((err: Error) => console.log(err));
    // });

    it('compose-success', async () => {
        mailer.setStyle({
            backgroundColor: "#181818",
            contentColor: "#FFFFFF",
            boldColor: "#000000",
            textColor: "#000000",
            mainColor: "#000000",
            mainButtonColor: "#C9BE37",
            mainColorHover: "#EDDD0A",
            textOnMainColor: "#FFFFFF"
        })

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
                type: EmailPartType.ThreeEvenColsXs,
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
            companyName: 'Test',
            street: 'Via di qua',
            logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/1200px-Google_2015_logo.svg.png"
        }

        const html = await mailer.compose(emailParts, company);

        fs.writeFile('./tests/tmp/email.html', (html), (err) => {
            if (err) {
                console.log(err);
            }
        })

        const result = await mailer.send('subject', 'from', ['to1', 'to2'], html);
        console.log(result);
    })
})