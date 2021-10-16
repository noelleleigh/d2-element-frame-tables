import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const md5 = (data) => {
  return crypto.createHash("md5").update(data).digest();
};

const cacheFilePath = (key) => {
  return path.join(currentDir, ".cache", `${md5(key)}.json`);
};

const cacheObject = async (key, data) => {
  return fs.writeFile(cacheFilePath(key), JSON.stringify(data));
};

const readFromCache = async (key) => {
  return fs
    .readFile(cacheFilePath(key), "utf-8")
    .then((contents) => JSON.parse(contents));
};

export { cacheObject, readFromCache };
