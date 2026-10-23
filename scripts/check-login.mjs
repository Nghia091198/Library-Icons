const LOGIN_PATH = '/api/auth/login';
const REQUEST_TIMEOUT_MS = 3000;
const PROBE_CREDENTIALS = { email: 'probe@example.com', password: 'not-the-real-password' };

const TARGETS = [
  { label: 'Server trực tiếp', url: `http://localhost:8787${LOGIN_PATH}` },
  { label: 'Qua proxy Vite', url: `http://localhost:5173${LOGIN_PATH}` },
];

async function probe({ label, url }) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(PROBE_CREDENTIALS),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const body = await response.text();
    console.log(`${label}: HTTP ${response.status}`);
    console.log(`  content-type: ${response.headers.get('content-type')}`);
    console.log(`  body: ${body.slice(0, 300)}`);
  } catch (error) {
    console.log(`${label}: ${error.cause?.code ?? error.name ?? 'unknown'}`);
  }
}

for (const target of TARGETS) {
  await probe(target);
}
