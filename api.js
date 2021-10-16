// Implementation details for interacting with the Bungie.net API

import dotEnv from "dotenv";
import * as cache from "./cache.js";
import fetch from "./fetch.js";
dotEnv.config();

const commonHeaders = {
  "User-Agent": process.env.USER_AGENT,
  "X-API-Key": process.env.API_KEY,
};

const authorizedFetch = (url) => {
  return fetch(url, { headers: commonHeaders });
};

const getApi = async (path) => {
  const url = new URL(path, "https://www.bungie.net");
  let data;
  try {
    data = await cache.readFromCache(url.toString());
  } catch (error) {
    data = await authorizedFetch(url).then((res) => res.json());
    cache.cacheObject(url.toString(), data);
  }
  return data;
};

const getManifest = async (lang) => {
  const manifest = await getApi("/Platform/Destiny2/Manifest/");
  return manifest.Response.jsonWorldComponentContentPaths[lang];
};

export { getApi, getManifest };