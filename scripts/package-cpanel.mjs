// Builds the cPanel upload folder from `next build` output (output: "standalone").
// Usage: npm run build:cpanel   ->  cpanel-build/taa-platform/  and  cpanel-build/taa-platform-cpanel.zip
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");
if (!existsSync(join(standalone, "server.js"))) {
  console.error('No .next/standalone/server.js. Run "next build" first (next.config.ts needs output: "standalone").');
  process.exit(1);
}

const outRoot = join(root, "cpanel-build");
const out = join(outRoot, "taa-platform");
rmSync(outRoot, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// Server, its trimmed node_modules and the build output.
cpSync(standalone, out, { recursive: true, dereference: true });
// Static assets and public files are not copied into standalone by Next.js.
cpSync(join(root, ".next", "static"), join(out, ".next", "static"), { recursive: true });
if (existsSync(join(root, "public"))) cpSync(join(root, "public"), join(out, "public"), { recursive: true });
// Passenger startup file and the settings template.
cpSync(join(root, "deploy", "cpanel", "app.js"), join(out, "app.js"));
cpSync(join(root, "deploy", "cpanel", ".env.cpanel.example"), join(out, ".env.example"));
// Never ship local secrets.
for (const f of [".env", ".env.local", ".env.production.local", ".env.development.local"]) rmSync(join(out, f), { force: true });
writeFileSync(join(out, "BUILD-INFO.txt"), `Built ${new Date().toISOString()} with Node ${process.version}\nStartup file: app.js\n`);

try {
  execSync(`cd "${outRoot}" && zip -qr taa-platform-cpanel.zip taa-platform`, { stdio: "inherit" });
  console.log("Ready: cpanel-build/taa-platform-cpanel.zip");
} catch {
  console.log("Ready: cpanel-build/taa-platform (zip it yourself; the zip command was not found)");
}
