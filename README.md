# MrApps Email NodeModule

Email handler for TypeScript: composes responsive HTML emails from a fixed set of
building blocks (via [Twig](https://www.npmjs.com/package/twig) templates), sends them
over SMTP or Amazon SES (via [nodemailer](https://www.npmjs.com/package/nodemailer)),
and can generate `.ics` calendar invites.

## Requirements

- TypeScript 5.*
- Node.js >=22 <25

## Installation

```bash
npm install @mrapps-rsm/mrappsemailnodemodule
```

## Exports

```javascript
import {
  Mailer,
  Configuration,
  TransportType,
  Style,
  CompanyInfo,
  EmailPart,
  EmailPartType,
  EmailPartRow,
  EmailMetadata,
  EmailAttachment,
  EmailMessage,
  EventAttribute,
} from '@mrapps-rsm/mrappsemailnodemodule';
```

| Export | Kind | Purpose |
|---|---|---|
| `Mailer` | class | Main entry point: builds the transport, renders templates, sends emails. |
| `Configuration` | class | Constructor input for `Mailer`. See [Configuration](#configuration). |
| `TransportType` | enum | `SMTP` \| `AMAZON_SES`. Selects the transport in `Configuration.transport`. |
| `Style` | type | Color palette used by `compose()`. See [Style](#style). |
| `CompanyInfo` | interface | Footer/header data for `compose()`. See [CompanyInfo](#companyinfo). |
| `EmailPart` | interface | One block of the composed email body. See [EmailPart](#emailpart--emailparttype). |
| `EmailPartType` | enum | The kind of block an `EmailPart` represents. |
| `EmailPartRow` | type | One image+caption cell inside a multi-column `EmailPart`. |
| `EmailMetadata` | interface | Optional extras (`ical`, `text`, `attachments`) for `send()`. |
| `EmailAttachment` | interface | A single attachment; same shape as a `nodemailer` attachment. |
| `EmailMessage` | interface | One message for `sendMulti()`. |
| `EventAttribute` | interface | Input for `generateCal()`. |

## Configuration

Configuration is passed as a single object (typed as `Configuration`) to the `Mailer`
constructor. The `transport` field selects which of the two transports is created; all
other fields are only read for the matching transport.

```javascript
import { Mailer, Configuration, TransportType } from '@mrapps-rsm/mrappsemailnodemodule';

const config: Configuration = { /* ... see tables below ... */ };
const mailer = new Mailer(config);
```

If `new Mailer()` is called with no argument at all, no transport is created
(`mailer.transporter` stays `undefined`) — you can still call `compose()`/`generateCal()`,
but `send()`/`sendMulti()` will throw `Error("Transporter not initialized")` until you call
`mailer.setTransporter(...)` yourself.

### SMTP configuration

```json
{
  "transport": "SMTP",
  "host": "smtp.example.com",
  "port": 587,
  "user": "user@example.com",
  "password": "user_password"
}
```

| Field       | Type     | Required | Default | Description |
|-------------|----------|----------|---------|-------------|
| `transport` | `TransportType` | yes, must be `TransportType.SMTP` (`"SMTP"`) | `TransportType.SMTP` | Selects the SMTP transport. |
| `host`      | `string` | yes (no default) | – | SMTP server hostname. |
| `port`      | `number` | yes (no default) | – | SMTP server port, e.g. `587` (STARTTLS) or `465` (implicit TLS). Passed as a real number, not a string. |
| `user`      | `string` | recommended | `""` if omitted | SMTP auth username. Also used as the message `sender` header for every email sent via `send()` (see [sender vs from](#sender-vs-from)). |
| `password`  | `string` | recommended | `""` if omitted | SMTP auth password. |

Notes:
- The transport is created with `pool: true` (a pooled `nodemailer` transport, reused
  across calls, required by `sendMulti()`'s `isIdle()` check) and `auth.type: "login"`.
- `user`/`password` are not validated at construction time; if omitted they default to
  `""`, and the underlying SMTP server will simply reject the connection at send time.

### Amazon SES configuration

```json
{
  "transport": "AMAZON_SES",
  "aws_source_address": "no-reply@example.com",
  "aws_region": "eu-west-1",
  "aws_access_key_id": "AKIA...",
  "aws_secret_access_key": "..."
}
```

| Field                    | Type     | Required | Default | Description |
|--------------------------|----------|----------|---------|-------------|
| `transport`              | `TransportType` | yes, must be `TransportType.AMAZON_SES` (`"AMAZON_SES"`) | `TransportType.SMTP` | Selects the SES transport. **Must be set explicitly** — the class default is `SMTP`. |
| `aws_source_address`     | `string` | recommended | `""` if omitted | Used as the message `sender` header for every email sent via `send()` (see [sender vs from](#sender-vs-from)). Not passed to the AWS SDK. |
| `aws_region`             | `string` | no | `"eu-west-1"` | AWS region for the `SESv2Client`. |
| `aws_access_key_id`      | `string` | no | falls back to `process.env.AWS_ACCESS_KEY_ID`, then `""` | AWS access key. |
| `aws_secret_access_key`  | `string` | no | falls back to `process.env.AWS_SECRET_ACCESS_KEY`, then `""` | AWS secret key. |

Notes:
- If `aws_access_key_id`/`aws_secret_access_key` are omitted, the standard
  `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` environment variables are used instead —
  useful when credentials are provided by the environment (CI, ECS task role env
  injection, etc.) rather than hardcoded in the config object. This module does **not**
  fall back to the AWS SDK's default credential provider chain (e.g. instance/task
  roles resolved automatically by the SDK) — only the two explicit env vars above.
- The transporter is created via `nodemailer.createTransport({ SES: { sesClient, SendEmailCommand } })`
  using `@aws-sdk/client-sesv2`.

### `sender` vs `from`

Regardless of transport, every email sent via `mailer.send(...)` sets the `sender`
header from the configuration (`user` for SMTP, `aws_source_address` for SES), while the
visible `from` address is whatever you pass as the `from` argument to `send()`. If you
don't need a distinct envelope sender, set `user`/`aws_source_address` to the same
address you plan to pass as `from`. Note that `sendMulti()` does **not** set `sender` —
see [sendMulti](#sendmultimessages).

### Unrecognized or missing `transport`

Passing a `transport` value other than `TransportType.SMTP` or `TransportType.AMAZON_SES`
(or omitting it while still passing a config object) results in `mailer.transporter`
staying `undefined` — no error is thrown. `send()`/`sendMulti()` will then throw
`Error("Transporter not initialized")` until `setTransporter()` is called.

## Mailer API

### `new Mailer(config?: Configuration)`

Builds the transport as described in [Configuration](#configuration) above. Also
globally registers a Twig `truncate(length = 10)` filter (used internally by the
`ThumbnailText` part) — safe to call multiple times, it just re-registers the same
filter. If no `config` is passed, no transport is created and the filter is **not**
registered either (only happens inside the `if (config)` branch).

### `setTransporter(transporter: nodemailer.Transporter): void`

Overrides `mailer.transporter` with an externally created `nodemailer` transporter —
useful for tests (inject a mock/stub) or for transports not covered by `Configuration`
(e.g. `sendmail`, a custom plugin transport).

### `close(): void`

Closes the pooled SMTP connections (`transporter.close()`) and, for the SES transport,
destroys the underlying `SESv2Client`. Call it when you're done sending (e.g. at the end
of a CLI script or job): a pooled transport keeps connections open and will otherwise
prevent the Node.js process from exiting. Safe to call when no transport was created.

```javascript
try {
  await mailer.send(/* ... */);
} finally {
  mailer.close();
}
```

### `setStyle(style: Style): void`

Overrides the color palette used by `compose()`. If not called, the following defaults
are used:

```javascript
{
  backgroundColor: "#F5F5F5",
  contentColor: "#FFFFFF",
  boldColor: "#000000",
  textColor: "#555555",
  mainColor: "#333333",
  mainButtonColor: "#333333",
  mainColorHover: "#000000",
  textOnMainColor: "#FFFFFF",
}
```

#### `Style`

All fields are required (there's no partial override — pass the full object):

| Field | Description |
|---|---|
| `backgroundColor` | Page background, behind the email card. |
| `contentColor` | Background of the email card itself. |
| `boldColor` | Color of bolded/emphasized text (titles). |
| `textColor` | Default body text color. |
| `mainColor` | Accent color: button background, `BgImageWithText` background fallback. |
| `mainButtonColor` | Button background/border color for `OneColText`'s CTA button. |
| `mainColorHover` | Button hover color (CSS `:hover`, has no effect in most email clients). |
| `textOnMainColor` | Text color used on top of `mainColor`/buttons. |

### `compose(emailParts: Array<EmailPart>, companyInfo: CompanyInfo): Promise<string>`

Renders the full HTML email (header with logo, a sequence of body parts, footer with
company info) using `views/index.html.twig` and returns the resulting HTML string.
Does not send anything — pass the result to `send()`/`sendMulti()` as the `html`.

#### `CompanyInfo`

| Field | Type | Required | Description |
|---|---|---|---|
| `logoUrl` | `string` | yes | Logo shown at the top of the email. |
| `companyName` | `string` | yes | Shown in the footer and as the logo's `alt` text. |
| `street` | `string` | yes | Shown in the footer, under the company name. |
| `otherInfo` | `string` | no | Extra footer line (e.g. VAT number), only rendered if non-empty. |

#### `EmailPart` / `EmailPartType`

Every part has a `type: EmailPartType` plus a subset of the following optional fields,
depending on the type. Passing a field a given type doesn't use is harmless (it's simply
ignored by that part's template).

| Field | Type | Used by |
|---|---|---|
| `imageUrl` | `string` | `Image`, `BlockedImage`, `ThumbnailText` |
| `title` | `string` | `OneColText`, `TwoEvenColsXs`, `ThreeEvenColsXs`, `ThumbnailText` |
| `description` | `string` (HTML allowed, rendered raw) | `OneColText`, `BgImageWithText`, `ThumbnailText` |
| `direction` | `string` (only `"left"` is meaningful, anything else behaves like `"right"`) | `ThumbnailText` |
| `link` | `string` | `OneColText`, `ThumbnailText` |
| `linkTitle` | `string` (button label; falls back to `link` if omitted) | `OneColText`, `ThumbnailText` |
| `backgroundUrl` | `string` | `BgImageWithText` |
| `xsInvariate` | `boolean` (if `true`, columns don't stack on narrow/mobile screens) | `TwoEvenColsXs` |
| `rows` | `Array<EmailPartRow>` | `TwoEvenColsXs`, `ThreeEvenColsXs` |

`EmailPartRow`: `{ imageUrl: string; description: string }` — one image+caption cell.
For `TwoEvenColsXs`/`ThreeEvenColsXs`, `rows` is chunked automatically into groups of
2 or 3 per row.

`EmailPartType` values and what each renders:

| `EmailPartType` | Renders | Required fields |
|---|---|---|
| `Image` | Full-width hero image. | `imageUrl` |
| `BlockedImage` | Smaller, non-full-width image. | `imageUrl` |
| `OneColText` | Title + rich-text description, optional CTA button. | `description` (`title`, `link`, `linkTitle` optional) |
| `BgImageWithText` | Full-width background image with overlaid rich-text. | `backgroundUrl`, `description` |
| `TwoEvenColsXs` | 2-column image+caption grid (1 column on narrow screens unless `xsInvariate`). | `rows` (`title` optional) |
| `ThreeEvenColsXs` | 3-column image+caption grid. | `rows` (`title` optional) |
| `ThumbnailText` | Image + title/description side by side, optional CTA button. `title` truncated to 88 chars, `description` truncated to 103 (with `link`) or 253 chars (without). | `imageUrl`, `description` (`title`, `direction`, `link`, `linkTitle` optional) |
| `Border` | A thin horizontal divider. No fields used. | – |

Example — one of every part type:

```javascript
const emailParts: Array<EmailPart> = [
  { type: EmailPartType.Image, imageUrl: "https://placehold.co/600x300" },
  { type: EmailPartType.BlockedImage, imageUrl: "https://placehold.co/300x200" },
  {
    type: EmailPartType.OneColText,
    title: "Welcome",
    description: "Some <b>HTML</b> description.",
    link: "https://example.com",
    linkTitle: "Go to website",
  },
  {
    type: EmailPartType.BgImageWithText,
    backgroundUrl: "https://placehold.co/600x230",
    description: "Overlaid text on a background image.",
  },
  {
    type: EmailPartType.TwoEvenColsXs,
    title: "2 columns",
    xsInvariate: false,
    rows: [
      { imageUrl: "https://placehold.co/270", description: "Row 1" },
      { imageUrl: "https://placehold.co/270", description: "Row 2" },
    ],
  },
  {
    type: EmailPartType.ThreeEvenColsXs,
    title: "3 columns",
    rows: [
      { imageUrl: "https://placehold.co/170", description: "Row 1" },
      { imageUrl: "https://placehold.co/170", description: "Row 2" },
      { imageUrl: "https://placehold.co/170", description: "Row 3" },
    ],
  },
  {
    type: EmailPartType.ThumbnailText,
    direction: "left",
    imageUrl: "https://placehold.co/170",
    title: "Thumbnail title",
    description: "Thumbnail description.",
    link: "https://example.com",
    linkTitle: "Go to website",
  },
  { type: EmailPartType.Border },
];

const company: CompanyInfo = {
  companyName: "Test Company",
  street: "Via di qua, 12",
  logoUrl: "https://placehold.co/200x50",
};

const html = await mailer.compose(emailParts, company);
```

### `generateCal(data: EventAttribute): Promise<string>`

Renders an iCalendar (`.ics`) `VEVENT` invite as a string, using
`views/parts/ical_file.ics.twig`. The result is meant to be passed as
`metadata.ical` to `send()` (see below) — `send()` takes care of wrapping it into a
proper `icalEvent` attachment.

#### `EventAttribute`

| Field | Type | Required | Maps to |
|---|---|---|---|
| `start` | `string` | yes | `DTSTART` — pass an already-formatted iCalendar date-time (e.g. `"20260101T090000Z"`), it is not parsed or validated. |
| `end` | `string` | yes | `DTEND`. |
| `uid` | `string` | yes | `UID` — should be globally unique per event. |
| `created` | `string` | yes (accepted, currently unused by the template) | – |
| `lastModified` | `string` | yes | `DTSTAMP`, `CREATED`, `LAST-MODIFIED` (all three reuse this same value). |
| `title` | `string` | yes | `SUMMARY`. |
| `description` | `string` | no | `DESCRIPTION`. |
| `organizer.name` | `string` | yes | `ORGANIZER;CN=...`. |
| `organizer.email` | `string` | yes | `ORGANIZER` `mailto:` address. |
| `partecipant.email` | `string` | yes | `ATTENDEE` `mailto:` address (also used as `CN`). |

Note the field is named `partecipant` (Italian spelling), not `participant`. The
generated invite always uses `METHOD:REQUEST`, a single attendee, and does not set
`LOCATION` (left empty).

```javascript
const ical = await mailer.generateCal({
  start: "20260101T090000Z",
  end: "20260101T100000Z",
  uid: "event-1@example.com",
  created: "20260101T000000Z",
  lastModified: "20260101T000000Z",
  title: "Meeting",
  description: "Quarterly sync",
  organizer: { name: "Alice", email: "alice@example.com" },
  partecipant: { email: "bob@example.com" },
});
```

### `send(subject, from, to, html, metadata?): Promise<nodemailer.SentMessageInfo>`

Sends a single email through the configured transport.

| Parameter | Type | Description |
|---|---|---|
| `subject` | `string` | Email subject. |
| `from` | `string` | Visible `From` address (see [sender vs from](#sender-vs-from)). |
| `to` | `Array<string>` | Recipient addresses; joined into a single comma-separated `to` header (`to.join(",")`). |
| `html` | `any` | HTML body — typically the result of `compose()`, but any string works. |
| `metadata` | `EmailMetadata` (optional) | See below. |

#### `EmailMetadata`

| Field | Type | Description |
|---|---|---|
| `ical` | `string` | Raw `.ics` content (e.g. from `generateCal()`). Turned into an `icalEvent` with `method: "request"` and `filename: "invitation.ics"`. Only added if truthy — an empty string is treated as "no invite". |
| `text` | `string` | Plain-text alternative body. Only added if truthy. |
| `attachments` | `EmailAttachment[]` | Extra attachments, forwarded as-is to `nodemailer`. Only added if the array is truthy (an empty array `[]` is still truthy and will be forwarded). |

`EmailAttachment` mirrors `nodemailer`'s attachment shape (`filename`, `content`/`path`,
`cid`, `encoding`, `contentType`, `contentTransferEncoding`, `contentDisposition`,
`headers`, `raw`) — see the
[nodemailer attachments docs](https://nodemailer.com/message/attachments/) for details.

```javascript
const result = await mailer.send(
  "Subject",
  "from@example.com",
  ["to1@example.com", "to2@example.com"],
  html,
  {
    ical,
    text: "Plain-text fallback",
    attachments: [{ filename: "invoice.pdf", path: "/tmp/invoice.pdf" }],
  }
);
```

### `sendMulti(messages: EmailMessage[]): Promise<void>`

Sends a batch of messages back-to-back, only while the pooled SMTP/SES transport
reports itself idle (`transporter.isIdle()`); it stops (without erroring) as soon as
`isIdle()` returns `false`, leaving the rest of `messages` unsent. The input array is
mutated: each successfully sent message is `shift()`-ed off.

```javascript
const messages: EmailMessage[] = [
  { subject: "A", from: "from@example.com", to: ["a@example.com"], html: "<p>A</p>" },
  { subject: "B", from: "from@example.com", to: ["b@example.com"], html: "<p>B</p>" },
];
await mailer.sendMulti(messages);
// messages now only contains entries that were NOT sent (if the transport went busy).
```

#### `EmailMessage`

| Field | Type | Description |
|---|---|---|
| `subject` | `string` | Email subject. |
| `from` | `string` | Visible `From` address. |
| `to` | `Array<string>` | Recipient addresses, passed to `nodemailer` **as an array** (unlike `send()`, it is not joined into a comma-separated string — both forms are accepted by `nodemailer`). |
| `html` | `any` | HTML body. |
| `metadata` | `EmailMetadata` (optional) | **Not translated** — see caveat below. |

**Caveat:** unlike `send()`, `sendMulti()` passes each message straight to
`transporter.sendMail()` without converting `metadata.ical`/`metadata.text`/
`metadata.attachments` into the `icalEvent`/`text`/`attachments` fields `nodemailer`
understands. If you need calendar invites, a plain-text alternative, or attachments on
a batch-sent message, call `send()` in a loop instead of `sendMulti()`, or set
`icalEvent`/`text`/`attachments` directly on the `EmailMessage` object yourself.
`sendMulti()` also does **not** set the `sender` header the way `send()` does.

## Full example

```javascript
import {
  Mailer,
  TransportType,
  CompanyInfo,
  EmailPart,
  EmailPartType,
} from '@mrapps-rsm/mrappsemailnodemodule';

const mailer = new Mailer({
  host: "smtp.example.com",
  port: 587,
  user: "user@example.com",
  password: "user_password",
  transport: TransportType.SMTP,
});

// or with AMAZON_SES
/*
const mailer = new Mailer({
  aws_source_address: "no-reply@example.com",
  aws_access_key_id: "AKIA...",
  aws_secret_access_key: "...",
  aws_region: "eu-west-1",
  transport: TransportType.AMAZON_SES,
});
*/

// Optional (to override template colors)
mailer.setStyle({
  backgroundColor: "#F5F5F5",
  contentColor: "#FFFFFF",
  boldColor: "#000000",
  textColor: "#555555",
  mainColor: "#333333",
  mainButtonColor: "#333333",
  mainColorHover: "#000000",
  textOnMainColor: "#FFFFFF",
});

const emailParts: Array<EmailPart> = [
  { type: EmailPartType.Image, imageUrl: "https://placehold.co/600x300" },
  {
    type: EmailPartType.OneColText,
    title: "Welcome",
    description: "Some rich <b>HTML</b> description.",
    link: "https://example.com",
    linkTitle: "Go to website",
  },
  {
    type: EmailPartType.ThumbnailText,
    direction: "left",
    link: "https://example.com",
    linkTitle: "Go to website",
    imageUrl: "https://placehold.co/170",
    title: "Thumbnail title",
    description: "Thumbnail description.",
  },
];

const company: CompanyInfo = {
  companyName: "Test Company",
  street: "Via di qua, 12",
  logoUrl: "https://placehold.co/200x50",
};

// Compose HTML template
const html = await mailer.compose(emailParts, company);

// Send email with the generated template
const result = await mailer.send("subject", "from@example.com", ["to1@example.com", "to2@example.com"], html);
```
