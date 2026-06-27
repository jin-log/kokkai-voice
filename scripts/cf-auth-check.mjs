import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const tomlPath = path.join(
  os.homedir(),
  'AppData/Roaming/xdg.config/.wrangler/config/default.toml',
);

function loadConfig() {
  const t = fs.readFileSync(tomlPath, 'utf8');
  const pick = (key) => {
    const line = t.split(/\r?\n/).find((l) => l.startsWith(`${key} `));
    if (!line) return null;
    return line.split('=').slice(1).join('=').trim().replace(/^"|"$/g, '');
  };
  return {
    oauth: pick('oauth_token'),
    refresh: pick('refresh_token'),
    expiration: pick('expiration_time'),
  };
}

async function cf(token, url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  return { status: res.status, body: await res.json() };
}

const cfg = loadConfig();
console.log('expiration', cfg.expiration);

const zones = await cf(cfg.oauth, 'https://api.cloudflare.com/client/v4/zones?name=seiji1192.site');
console.log('zones_oauth', zones.body.success, zones.body.errors, zones.body.result?.map((z) => z.id));

const verify = await cf(cfg.oauth, 'https://api.cloudflare.com/client/v4/user/tokens/verify');
console.log('verify_oauth', verify.body.success, verify.body.errors);

if (cfg.refresh) {
  const res = await fetch('https://dash.cloudflare.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: cfg.refresh,
      client_id: '54d11594-72e4-41fd-9912-52a404b9efbc',
    }),
  });
  const refreshed = await res.json();
  console.log('refresh_status', res.status, refreshed.error || 'ok');
  if (refreshed.access_token) {
    const zones2 = await cf(refreshed.access_token, 'https://api.cloudflare.com/client/v4/zones?name=seiji1192.site');
    console.log('zones_refresh', zones2.body.success, zones2.body.errors);
    const zid = zones2.body.result?.[0]?.id;
    if (zid) {
      const dns = await cf(
        refreshed.access_token,
        `https://api.cloudflare.com/client/v4/zones/${zid}/dns_records?per_page=50`,
      );
      console.log('dns_refresh', dns.body.success, dns.body.errors, 'count', dns.body.result?.length ?? 0);
      dns.body.result?.forEach((r) => console.log([r.type, r.name, r.content].join('\t')));
    }
  }
}
