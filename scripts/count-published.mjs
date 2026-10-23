const ENDPOINT = 'http://localhost:8787/api/v1/icons?pageSize=1';

const response = await fetch(ENDPOINT);
const body = await response.json();
console.log(`HTTP ${response.status} · số icon đã publish (gallery công khai): ${body.total}`);
