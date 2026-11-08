import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { simulateAgent } from './simulation.mjs';

// Entrée exclusivement simulée : aucun mode réel, aucun client ni identifiant.
export async function main() {
  const policy = JSON.parse(await readFile(new URL('../../.github/beta-agent-policy.json', import.meta.url), 'utf8'));
  return simulateAgent(policy);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((result) => console.log(JSON.stringify(result))).catch((error) => {
    console.error(/^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : 'SIMULATION_FAILED');
    process.exitCode = 1;
  });
}
