const http = require('node:http');
const https = require('node:https');

function defaultRequester(url, init) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const request = (target.protocol === 'https:' ? https : http).request(target, {
      method: init.method || 'GET',
      headers: init.headers,
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      response.on('end', () => {
        const payload = Buffer.concat(chunks).toString('utf8');
        resolve({
          ok: response.statusCode >= 200 && response.statusCode < 300,
          status: response.statusCode,
          json: async () => payload ? JSON.parse(payload) : {},
        });
      });
    });
    request.on('error', reject);
    if (init.body) request.write(init.body);
    request.end();
  });
}

class SkylineAdminClient {
  constructor({ baseUrl, token, requester = defaultRequester }) {
    this.baseUrl = `${baseUrl.replace(/\/+$/, '')}/api/skyline/v1`;
    this.token = token;
    this.requester = requester;
  }

  async request(path, body) {
    const response = await this.requester(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || `Skyline API failed with status ${response.status}`);
    return payload;
  }

  async plan(manifest, options = {}) {
    return (await this.request('/admin/plan', {
      manifest,
      destructive: !!options.destructive,
    })).plan;
  }

  async sync(manifest, options = {}) {
    const plan = await this.plan(manifest, options);
    if (options.dryRun) return { plan, applied: false };
    const payload = await this.request('/admin/sync', {
      manifest,
      planRevision: manifest.revision,
      destructive: !!options.destructive,
      dryRun: false,
    });
    return { plan, ...payload.result };
  }
}

module.exports = { SkylineAdminClient };
