import * as https from "https";

class Response {
  constructor(body, init) {
    this.status = init.status;
    this.statusText = init.statusText;
    this.headers = init.headers;
    this.body = body;
  }

  json() {
    return JSON.parse(this.body);
  }
}

/**
 * It's like fetch sortof
 * @param {*} url
 * @param {*} options
 * @returns
 */
export default (url, options) => {
  return new Promise((resolve, reject) => {
    const request = https.request(url, options);
    // console.log(`Fetching ${url} ...`);
    request.on("response", (response) => {
      response.setEncoding("utf-8");
      let body = "";
      response.on("data", (chunk) => {
        body = body + chunk;
      });
      response.on("end", () => {
        resolve(
          new Response(body, {
            status: response.statusCode,
            statusText: response.statusMessage,
            headers: response.headers,
          })
        );
      });
    });
    request.on("error", (error) => {
      reject(error);
    });
    request.end();
  });
};
