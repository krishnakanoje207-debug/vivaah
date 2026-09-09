// Regenerate ADMIN_PASSWORD_HASH at 100,000 PBKDF2 iterations (Cloudflare
// Workers WebCrypto rejects anything above 100k — the old 310k hash crashed
// every live login). Updates .env.local and pushes the wrangler secret.
//
// Usage:  cd site && node scripts/rotate-admin-hash.mjs
// Prompts for the admin password (input hidden), then:
//   1. writes the new hash into .env.local
//   2. runs `npx wrangler secret put ADMIN_PASSWORD_HASH`

import { pbkdf2Sync, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline";

const ITERATIONS = 100_000; // Workers WebCrypto max

const b64url = (buf) =>
  buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, ITERATIONS, 32, "sha256");
  return `pbkdf2:${ITERATIONS}:${b64url(salt)}:${b64url(hash)}`;
}

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const onData = (char) => {
      if (!["\n", "\r", ""].includes(char.toString())) {
        // overwrite echoed char so the password stays hidden
        process.stdout.write("\x1b[2K\x1b[200D" + question);
      }
    };
    process.stdin.on("data", onData);
    rl.question(question, (answer) => {
      process.stdin.off("data", onData);
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const password = process.argv[2] ?? (await promptHidden("Admin password: "));
if (!password) {
  console.error("No password given.");
  process.exit(1);
}

const newHash = hashPassword(password);

// 1. .env.local
const envPath = new URL("../.env.local", import.meta.url);
const env = readFileSync(envPath, "utf8");
if (!/^ADMIN_PASSWORD_HASH=.*$/m.test(env)) {
  console.error("ADMIN_PASSWORD_HASH line not found in .env.local — aborting.");
  process.exit(1);
}
writeFileSync(envPath, env.replace(/^ADMIN_PASSWORD_HASH=.*$/m, `ADMIN_PASSWORD_HASH="${newHash}"`));
console.log(`.env.local updated (pbkdf2:${ITERATIONS}).`);

// 2. live Worker secret
const res = spawnSync("npx", ["wrangler", "secret", "put", "ADMIN_PASSWORD_HASH"], {
  input: newHash,
  stdio: ["pipe", "inherit", "inherit"],
  shell: process.platform === "win32",
});
process.exit(res.status ?? 1);
