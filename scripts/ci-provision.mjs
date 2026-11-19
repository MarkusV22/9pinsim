// CI: D1-Datenbank anlegen (falls nötig) und die echte ID in wrangler.jsonc eintragen.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
const DB = "9pinsim";
const sh = (c) => execSync(c, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
let db = JSON.parse(sh("npx --yes wrangler@4 d1 list --json")).find((d) => d.name === DB);
if (!db) { console.log(`D1 ${DB} wird angelegt …`); sh(`npx --yes wrangler@4 d1 create ${DB} --location weur`); db = JSON.parse(sh("npx --yes wrangler@4 d1 list --json")).find((d) => d.name === DB); }
if (!db?.uuid) throw new Error("D1-Datenbank nicht gefunden");
console.log(`D1: ${DB} (${db.uuid})`);
writeFileSync("wrangler.jsonc", readFileSync("wrangler.jsonc", "utf8").replace("LOCAL-ONLY-REPLACE-AFTER-wrangler-d1-create", db.uuid));
