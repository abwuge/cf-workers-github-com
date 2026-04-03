// GitHub Proxy Worker
// Usage: https://gh.example.com/https://github.com/user/repo

const ALLOWED_HOSTS = [
  "github.com",
  "raw.githubusercontent.com",
  "gist.github.com",
  "gist.githubusercontent.com",
  "github.githubassets.com",
  "objects.githubusercontent.com",
  "codeload.github.com",
  "releases.githubusercontent.com",
  "release-assets.githubusercontent.com",
  "cloud.githubusercontent.com",
  "avatars.githubusercontent.com",
  "private-user-images.githubusercontent.com",
];

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname + url.search;

    if (path === "/" || path === "") {
      return new Response(
        `GitHub Proxy Worker\n\n` +
          `Usage: https://${url.host}/https://github.com/user/repo\n` +
          `Clone: git clone https://${url.host}/https://github.com/user/repo.git\n`,
        { headers: { "Content-Type": "text/plain; charset=utf-8" } }
      );
    }

    let targetUrl = path.substring(1);
    if (targetUrl.startsWith("github.com")) {
      targetUrl = "https://" + targetUrl;
    }
    if (!/^https?:\/\//.test(targetUrl)) {
      targetUrl = "https://github.com/" + targetUrl;
    }

    let parsedTarget;
    try {
      parsedTarget = new URL(targetUrl);
    } catch {
      return new Response("Invalid URL: " + targetUrl, { status: 400 });
    }

    if (!ALLOWED_HOSTS.includes(parsedTarget.hostname)) {
      return new Response("Only GitHub domains are allowed.", { status: 403 });
    }

    const headers = new Headers(request.headers);
    headers.delete("host");

    let response;
    try {
      response = await fetch(
        new Request(parsedTarget.toString(), {
          method: request.method,
          headers,
          body: request.body,
          redirect: "manual",
        })
      );
    } catch (err) {
      return new Response("Proxy error: " + err.message, { status: 502 });
    }

    // Rewrite redirect Location to go through proxy
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("Location");
      if (location) {
        let newLocation = location;
        try {
          const abs = new URL(location, parsedTarget.toString());
          if (ALLOWED_HOSTS.includes(abs.hostname)) {
            newLocation = url.origin + "/" + abs.toString();
          }
        } catch {}

        const redirectHeaders = new Headers(response.headers);
        redirectHeaders.set("Location", newLocation);
        return new Response(null, {
          status: response.status,
          headers: redirectHeaders,
        });
      }
    }

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    responseHeaders.set("Access-Control-Allow-Headers", "*");
    responseHeaders.delete("Content-Security-Policy");
    responseHeaders.delete("X-Frame-Options");

    const contentType = responseHeaders.get("Content-Type") || "";
    if (contentType.includes("text/html")) {
      let body = await response.text();
      const proxyOrigin = url.origin;

      for (const host of ALLOWED_HOSTS) {
        body = body.replaceAll(`https://${host}`, `${proxyOrigin}/https://${host}`);
        body = body.replaceAll(`http://${host}`, `${proxyOrigin}/https://${host}`);
      }

      body = body.replace(
        /((?:href|src|action)\s*=\s*["'])\/(?!\/)/g,
        `$1/${parsedTarget.origin}/`
      );

      return new Response(body, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  },
};
