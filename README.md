# language-learning-cast-phrasebook

Test bed for casting phrasebook audio to a Google Cast device (e.g. a Nest
Mini) straight from desktop Chrome — no phone needed. Uses Google's
[default media receiver](https://developers.google.com/cast/docs/caf_receiver)
(`CC1AD845`), so no Cast Developer Console registration is required.

Same read-only backend as `language-learning-mobile-phrasebook` /
`language-learning-drive-phrasebook` (HMAC-authed `GET /phrases` Lambda +
S3-hosted audio).

## Setup

```
cp config.example.js config.js
```

Fill in `config.js` with the same values as
`language-learning-mobile-phrasebook/.env.local` (`HMAC_SECRET`,
`LAMBDA_URL`, `AUDIO_BASE_URL`). `config.js` is gitignored.

## Run

Needs a static server — Chrome's Cast SDK won't run from a `file://` URL,
but works fine over plain `http://localhost`.

```
npx serve .
```

Open the printed `http://localhost:...` URL in Chrome, on the same Wi-Fi
network as the Cast device. Click the Cast icon next to the title, pick the
device, then click **Load phrases** and **Cast** a phrase or **Cast all as
queue**.

## Status

Proof-of-concept: casts a flat queue of "normal" audio clips in order, no
cadence/gap logic. If this is good enough standalone-listening-wise, the
next step is a custom Cast receiver app that reimplements the mobile app's
`usePlayer.js` segment engine so sessions can run independent of the sender.
