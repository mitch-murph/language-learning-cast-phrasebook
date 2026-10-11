// Copy to config.js for local dev (never commit config.js).
// Same backend as the other phrasebook apps — values come from
// language-learning-mobile-phrasebook/.env.local.
window.CAST_PHRASEBOOK_CONFIG = {
  HMAC_SECRET: 'your-hmac-secret-here',
  LAMBDA_URL: 'https://xxxxxxxxxxxxxxxx.lambda-url.ap-southeast-2.on.aws',
  AUDIO_BASE_URL: 'https://your-bucket-name.s3.amazonaws.com',
};
