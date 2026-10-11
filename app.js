// Cast sender test page. Static, no build step. Loaded after config.js and
// the Cast Web Sender SDK (see index.html).
//
// Uses chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID — the stock receiver
// Google ships for every Cast device, so no Cast Developer Console
// registration is needed to prove basic casting works.

const CONFIG = window.CAST_PHRASEBOOK_CONFIG;

const statusEl = document.getElementById('status');
const namespaceInput = document.getElementById('namespace');
const loadBtn = document.getElementById('load-btn');
const queueBtn = document.getElementById('queue-btn');
const stopBtn = document.getElementById('stop-btn');
const listEl = document.getElementById('phrase-list');

let phrases = [];

function setStatus(text) {
  statusEl.textContent = text;
}

// HMAC-SHA256(secret, floor(Date.now()/30000)) hex — matches the Lambda and
// the other phrasebook clients' token exactly (Web Crypto instead of
// js-sha256, same digest).
async function generateToken() {
  const windowIndex = Math.floor(Date.now() / 30000);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(CONFIG.HMAC_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(String(windowIndex)));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function audioUrl(s3Key) {
  return `${CONFIG.AUDIO_BASE_URL}/${s3Key}`;
}

async function listPhrases(namespace) {
  const headers = { 'x-app-token': await generateToken() };
  if (namespace) headers['x-namespace'] = namespace;
  const res = await fetch(`${CONFIG.LAMBDA_URL}/phrases`, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { phrases: rows } = await res.json();
  return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function getCastSession() {
  return cast.framework.CastContext.getInstance().getCurrentSession();
}

function loadSingle(phrase) {
  const session = getCastSession();
  if (!session) {
    setStatus('Not connected — click the Cast icon above and pick the Nest Mini first.');
    return;
  }
  const mediaInfo = new chrome.cast.media.MediaInfo(audioUrl(phrase.normalS3Key), 'audio/mpeg');
  mediaInfo.metadata = new chrome.cast.media.MusicTrackMediaMetadata();
  mediaInfo.metadata.title = phrase.text;
  mediaInfo.metadata.subtitle = phrase.translation || phrase.languageName;
  const request = new chrome.cast.media.LoadRequest(mediaInfo);
  session.loadMedia(request).then(
    () => setStatus(`Casting: ${phrase.text}`),
    (err) => setStatus(`Load failed: ${err.description || err}`)
  );
}

function loadQueue() {
  const session = getCastSession();
  if (!session) {
    setStatus('Not connected — click the Cast icon above and pick the Nest Mini first.');
    return;
  }
  if (phrases.length === 0) {
    setStatus('No phrases loaded.');
    return;
  }
  const items = phrases.map((p) => {
    const mediaInfo = new chrome.cast.media.MediaInfo(audioUrl(p.normalS3Key), 'audio/mpeg');
    mediaInfo.metadata = new chrome.cast.media.MusicTrackMediaMetadata();
    mediaInfo.metadata.title = p.text;
    mediaInfo.metadata.subtitle = p.translation || p.languageName;
    const item = new chrome.cast.media.QueueItem(mediaInfo);
    item.autoplay = true;
    return item;
  });
  const queueRequest = new chrome.cast.media.QueueLoadRequest(items);
  session.queueLoad(queueRequest).then(
    () => setStatus(`Casting queue of ${items.length} phrases.`),
    (err) => setStatus(`Queue load failed: ${err.description || err}`)
  );
}

function stopPlayback() {
  const session = getCastSession();
  const media = session && session.getMediaSession();
  if (!media) {
    setStatus('Nothing is casting.');
    return;
  }
  media.stop(new chrome.cast.media.StopRequest(), () => setStatus('Stopped.'), (err) =>
    setStatus(`Stop failed: ${err.description || err}`)
  );
}

function renderList() {
  listEl.innerHTML = '';
  for (const phrase of phrases) {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = `[${phrase.languageName}] ${phrase.text} — ${phrase.translation || ''}`;
    const btn = document.createElement('button');
    btn.textContent = 'Cast';
    btn.onclick = () => loadSingle(phrase);
    li.appendChild(label);
    li.appendChild(btn);
    listEl.appendChild(li);
  }
}

async function refreshPhrases() {
  setStatus('Loading phrases…');
  try {
    phrases = await listPhrases(namespaceInput.value.trim() || null);
    renderList();
    setStatus(`Loaded ${phrases.length} phrases.`);
  } catch (err) {
    setStatus(`Failed to load phrases: ${err.message}`);
  }
}

loadBtn.addEventListener('click', refreshPhrases);
queueBtn.addEventListener('click', loadQueue);
stopBtn.addEventListener('click', stopPlayback);

window.__onGCastApiAvailable = function (isAvailable) {
  if (!isAvailable) {
    setStatus('Cast SDK unavailable in this browser.');
    return;
  }
  cast.framework.CastContext.getInstance().setOptions({
    receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
    autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
  });
  setStatus('Cast ready — click the Cast icon above to connect to the Nest Mini.');
};
