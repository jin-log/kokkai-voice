#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prepareRemotionBg } from "./lib/prepare-remotion-bg.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

prepareRemotionBg(root)
  .then((p) => console.log("OK remotion bg:", path.relative(root, p)))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
