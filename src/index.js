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
  "github-cloud.githubusercontent.com",
  "github-cloud.s3.amazonaws.com",
];

const COOKIE_NAME = "ghproxy";
const COOKIE_MAX_AGE = 3600;

function hasProxyCookie(request) {
  const cookie = request.headers.get("Cookie") || "";
  return cookie.split(";").some((c) => c.trim().startsWith(COOKIE_NAME + "="));
}

function getRepoCookiePath(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length >= 2) return "/" + parts[0] + "/" + parts[1];
  if (parts.length === 1) return "/" + parts[0];
  return "/";
}

function setProxyCookie(headers, repoPath) {
  headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=${Date.now()}; Path=${repoPath}; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`
  );
}

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

    // /https://github.com/... → set cookie + redirect to /user/repo
    if (/^https?:\/\//.test(targetUrl)) {
      let parsedTarget;
      try {
        parsedTarget = new URL(targetUrl);
      } catch {
        return new Response("Invalid URL: " + targetUrl, { status: 400 });
      }
      if (!ALLOWED_HOSTS.includes(parsedTarget.hostname)) {
        return new Response("Only GitHub domains are allowed.", { status: 403 });
      }

      // For github.com HTML pages, set cookie and redirect to short path
      if (
        parsedTarget.hostname === "github.com" &&
        request.method === "GET" &&
        (request.headers.get("Accept") || "").includes("text/html")
      ) {
        const shortPath = parsedTarget.pathname + parsedTarget.search;
        const repoPath = getRepoCookiePath(parsedTarget.pathname);
        const redirectHeaders = new Headers();
        setProxyCookie(redirectHeaders, repoPath);
        redirectHeaders.set("Location", shortPath);
        return new Response(null, { status: 302, headers: redirectHeaders });
      }

      // Non-HTML or non-github.com: proxy directly
      return proxyRequest(request, url, parsedTarget);
    }

    // Short path: /user/repo → needs cookie for github.com HTML
    const parsedTarget = new URL("https://github.com/" + targetUrl);

    // Short path without cookie: show hint
    if (
      !hasProxyCookie(request) &&
      request.method === "GET" &&
      (request.headers.get("Accept") || "").includes("text/html")
    ) {
      const fullUrl = `${url.origin}/https://github.com${url.pathname}${url.search}`;
      return new Response(
        `Please visit via the full proxy URL:\n${fullUrl}\n`,
        {
          status: 403,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }
      );
    }

    return proxyRequest(request, url, parsedTarget);
  },
};

async function proxyRequest(request, proxyUrl, targetUrl) {
  const headers = new Headers(request.headers);
  headers.delete("host");

  let response;
  try {
    response = await fetch(
      new Request(targetUrl.toString(), {
        method: request.method,
        headers,
        body: request.body,
        redirect: "manual",
      })
    );
  } catch (err) {
    return new Response("Proxy error: " + err.message, { status: 502 });
  }

  if ([301, 302, 303, 307, 308].includes(response.status)) {
    const location = response.headers.get("Location");
    if (location) {
      let newLocation = location;
      try {
        const abs = new URL(location, targetUrl.toString());
        if (ALLOWED_HOSTS.includes(abs.hostname)) {
          if (abs.hostname === "github.com") {
            newLocation = abs.pathname + abs.search;
          } else {
            newLocation = proxyUrl.origin + "/" + abs.toString();
          }
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

  // Rewrite LFS batch API JSON responses to proxy download/upload/verify URLs
  if (contentType.includes("application/vnd.git-lfs+json") || contentType.includes("application/json")) {
    const url = targetUrl.toString();
    if (url.includes("/info/lfs/")) {
      let body = await response.text();
      try {
        const json = JSON.parse(body);
        if (json.objects) {
          const proxyOrigin = proxyUrl.origin;
          for (const obj of json.objects) {
            if (!obj.actions) continue;
            for (const action of Object.values(obj.actions)) {
              if (action.href) {
                try {
                  const hrefUrl = new URL(action.href);
                  if (ALLOWED_HOSTS.includes(hrefUrl.hostname)) {
                    action.href = `${proxyOrigin}/${action.href}`;
                  }
                } catch {}
              }
            }
          }
          body = JSON.stringify(json);
        }
      } catch {}
      return new Response(body, {
        status: response.status,
        headers: responseHeaders,
      });
    }
  }

  if (contentType.includes("text/html")) {
    let body = await response.text();
    const proxyOrigin = proxyUrl.origin;

    // Rewrite GitHub URLs: non-github.com domains use full prefix, github.com uses short path
    for (const host of ALLOWED_HOSTS) {
      if (host === "github.com") {
        body = body.replaceAll("https://github.com", proxyOrigin);
        body = body.replaceAll("http://github.com", proxyOrigin);
      } else {
        body = body.replaceAll(`https://${host}`, `${proxyOrigin}/https://${host}`);
        body = body.replaceAll(`http://${host}`, `${proxyOrigin}/https://${host}`);
      }
    }

    return new Response(body, {
      status: response.status,
      headers: responseHeaders,
    });
  }

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}
