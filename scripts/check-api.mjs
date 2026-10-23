const HEALTH_PATH = '/api/v1/health';
const REQUEST_TIMEOUT_MS = 3000;

const TARGETS = [
  { label: 'Server qua localhost', url: `http://localhost:8787${HEALTH_PATH}` },
  { label: 'Server qua IPv4', url: `http://127.0.0.1:8787${HEALTH_PATH}` },
  { label: 'Server qua IPv6', url: `http://[::1]:8787${HEALTH_PATH}` },
  { label: 'Qua proxy Vite', url: `http://localhost:5173${HEALTH_PATH}` },
];

async function check({ label, url }) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    const body = await response.text();
    console.log(`✔ ${label}: HTTP ${response.status} ${body.slice(0, 120)}`);
  } catch (error) {
    const reason = error.cause?.code ?? error.name ?? 'unknown';
    console.log(`✘ ${label}: ${reason}`);
  }
}

for (const target of TARGETS) {
  await check(target);
}
