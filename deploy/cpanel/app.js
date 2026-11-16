/**
 * Startup file for cPanel "Setup Node.js App" (Phusion Passenger).
 * Set "Application startup file" to app.js. Passenger gives the app its port.
 *
 * 1. Loads settings from a .env file next to this file, if there is one
 *    (values already set in cPanel's Environment variables win).
 * 2. Starts the Next.js standalone server (server.js).
 */
const fs = require("fs");
const path = require("path");

const envFile = path.join(__dirname, ".env");
if (fs.existsSync(envFile)) {
  for (const raw of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (process.env[key] === undefined || process.env[key] === "") process.env[key] = val;
  }
}

process.env.NODE_ENV = "production";
// cPanel servers set HOSTNAME to the machine name; Next.js would bind to it. Listen on all
// interfaces instead (Passenger sits in front and only it can reach the app).
process.env.HOSTNAME = process.env.BIND_HOST || "0.0.0.0";
if (!process.env.PORT) process.env.PORT = "3000";

require("./server.js");
