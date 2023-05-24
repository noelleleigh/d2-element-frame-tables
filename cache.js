import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const cacheDir = path.join(currentDir, ".cache");

const md5 = (data) => {
  return crypto.createHash("md5").update(data).digest("hex");
};

const cacheFilePath = (key) => {
  return path.join(cacheDir, `${md5(key)}.json`);
};

const cacheObject = async (key, data) => {
  await fs.mkdir(cacheDir, { recursive: true });
  return fs.writeFile(cacheFilePath(key), JSON.stringify(data));
};

const readFromCache = async (key) => {
  const contents = await fs.readFile(cacheFilePath(key), "utf-8");
  return JSON.parse(contents);
};

export { cacheObject, readFromCache };
