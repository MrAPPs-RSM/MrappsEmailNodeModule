import * as mocha from 'mocha';
import * as chai from 'chai';
import * as fs from 'fs';

import { Mailer, CompanyInfo, EmailPart, EmailPartType } from '../src';

const expect = chai.expect;

describe('compose-mail', async () => {
    const mailer = new Mailer({
        host: 'ssl0.ovh.net',
        port: 587,
        user: 'lorenzo.zoli@mr-apps.com',
        password: 'Mr?APP2020s!18'
    });

    // it('compose-fail', () => {
    //     mailer.compose([], {} as CompanyInfo)
    //         .catch((err: Error) => console.log(err));
    // });

    it('compose-success', async () => {
        mailer.setStyle({
            backgroundColor: "#000000",
            contentColor: "#181818",
            boldColor: "#FFFFFF",
            textColor: "#FFFFFF",
            mainColor: "#FFFFFF",
            mainButtonColor: "#C9BE37",
            mainColorHover: "#EDDD0A",
            textOnMainColor: "#181818"
        })

        const emailParts: Array<EmailPart> = [
            {
                type: EmailPartType.OneColText,
                title: 'Benvenuto !',
                description: 'Grazie per esserti registrato su Series of the Future, perfavore verifica la tua email.',
                link: "http://google.it",
                linkTitle: 'Conferma email'
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

        const result = await mailer.send('no-reply@mr-apps.com', 'no-reply@mr-apps.com', ['lorenzo.zoli@mr-apps.com', 'webmaster@mr-apps.com'], html);
        console.log(result);
    })
})