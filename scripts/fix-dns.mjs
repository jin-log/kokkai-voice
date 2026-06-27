import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const tomlPath = path.join(
  os.homedir(),
  'AppData/Roaming/xdg.config/.wrangler/config/default.toml',
);
const zoneId = '102763ddc38d878a7f1f905314fa21bd';
const accountId = 'f2e88512cd4a09f315291bf2406015d7';
const project = 'kokkai-voice';
const target = 'kokkai-voice.pages.dev';

function loadToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;
  const t = fs.readFileSync(tomlPath, 'utf8');
  const line = t.split(/\r?\n/).find((l) => l.startsWith('oauth_token'));
  if (!line) throw new Error('oauth_token not found');
  return line.split('=').slice(1).join('=').trim().replace(/^"|"$/g, '');
}

async function cf(url, init = {}) {
  const token = loadToken();
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const body = await res.json();
  return { status: res.status, body };
}

const zoneCheck = await cf('https://api.cloudflare.com/client/v4/zones?name=seiji1192.site');
const zoneIdFromApi = zoneCheck.body.result?.[0]?.id ?? zoneId;
console.log('zone', zoneCheck.body.success, zoneIdFromApi, zoneCheck.body.errors);

const allDns = await cf(
  `https://api.cloudflare.com/client/v4/zones/${zoneIdFromApi}/dns_records?per_page=50`,
);
console.log('dns_list', allDns.body.success, allDns.body.errors, 'count', allDns.body.result?.length ?? 0);
allDns.body.result?.forEach((r) => console.log([r.type, r.name, r.content, r.proxied].join('\t')));

async function ensureCname(name, content) {
  const list = await cf(
    `https://api.cloudflare.com/client/v4/zones/${zoneIdFromApi}/dns_records?type=CNAME&name=${encodeURIComponent(name)}`,
  );
  if (!list.body.success) {
    return { name, ok: false, step: 'list', errors: list.body.errors };
  }
  const hit = list.body.result?.find((r) => r.content === content);
  if (hit) return { name, ok: true, action: 'exists', id: hit.id };

  const created = await cf(`https://api.cloudflare.com/client/v4/zones/${zoneIdFromApi}/dns_records`, {
    method: 'POST',
    body: JSON.stringify({ type: 'CNAME', name, content, proxied: true, ttl: 1 }),
  });
  return {
    name,
    ok: created.body.success,
    action: 'create',
    errors: created.body.errors,
    id: created.body.result?.id,
  };
}

const domains = await cf(
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${project}/domains`,
);
console.log('pages_domains', JSON.stringify(domains.body.result?.map((d) => ({
  name: d.name,
  status: d.status,
  error: d.verification_data?.error_message,
})), null, 2));

const apex = await ensureCname('seiji1192.site', target);
const www = await ensureCname('www.seiji1192.site', target);
console.log('apex', JSON.stringify(apex));
console.log('www', JSON.stringify(www));
