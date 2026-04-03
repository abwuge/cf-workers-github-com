// GitHub Proxy Worker
// 用法: https://gh.example.com/https://github.com/user/repo
// 支持网页浏览和 git clone 加速

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname + url.search;

    // 首页提示
    if (path === "/" || path === "") {
      return new Response(
        "GitHub Proxy Worker\n\n" +
          "用法: 在 GitHub 链接前加上本域名\n" +
          "示例: https://" +
          url.host +
          "/https://github.com/user/repo\n" +
          "Git Clone: git clone https://" +
          url.host +
          "/https://github.com/user/repo.git\n",
        {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }
      );
    }

    // 从路径中提取目标 URL
    // pathname 以 / 开头，去掉第一个 /
    let targetUrl = path.substring(1);

    // 处理可能缺少协议的情况
    if (targetUrl.startsWith("github.com")) {
      targetUrl = "https://" + targetUrl;
    }

    // 验证目标 URL 是否为合法的 GitHub 域名
    let parsedTarget;
    try {
      parsedTarget = new URL(targetUrl);
    } catch {
      return new Response("Invalid URL: " + targetUrl, { status: 400 });
    }

    const allowedHosts = [
      "github.com",
      "raw.githubusercontent.com",
      "gist.github.com",
      "gist.githubusercontent.com",
      "github.githubassets.com",
      "objects.githubusercontent.com",
      "codeload.github.com",
      "releases.githubusercontent.com",
      "cloud.githubusercontent.com",
      "avatars.githubusercontent.com",
      "private-user-images.githubusercontent.com",
    ];

    if (!allowedHosts.includes(parsedTarget.hostname)) {
      return new Response("Only GitHub domains are allowed.", { status: 403 });
    }

    // 构建代理请求
    const headers = new Headers(request.headers);

    // 移除可能导致问题的头部
    headers.delete("host");
    // 保留 User-Agent（git clone 需要）

    const proxyRequest = new Request(parsedTarget.toString(), {
      method: request.method,
      headers,
      body: request.body,
      redirect: "manual", // 手动处理重定向
    });

    let response;
    try {
      response = await fetch(proxyRequest);
    } catch (err) {
      return new Response("Proxy fetch failed: " + err.message, {
        status: 502,
      });
    }

    // 处理重定向：将 GitHub 的重定向 Location 改写为指向代理
    const status = response.status;
    if ([301, 302, 303, 307, 308].includes(status)) {
      const location = response.headers.get("Location");
      if (location) {
        let newLocation;
        try {
          // 处理绝对 URL 或相对 URL
          const absLocation = new URL(location, parsedTarget.toString());
          if (allowedHosts.includes(absLocation.hostname)) {
            newLocation =
              url.origin + "/" + absLocation.toString();
          } else {
            newLocation = location;
          }
        } catch {
          newLocation = location;
        }

        const redirectHeaders = new Headers(response.headers);
        redirectHeaders.set("Location", newLocation);
        return new Response(null, {
          status,
          headers: redirectHeaders,
        });
      }
    }

    // 构建响应，修改 CORS 和安全相关头部
    const responseHeaders = new Headers(response.headers);

    // 允许跨域访问
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    responseHeaders.set("Access-Control-Allow-Headers", "*");

    // 删除阻止代理的安全头部
    responseHeaders.delete("Content-Security-Policy");
    responseHeaders.delete("X-Frame-Options");

    // 对于 HTML 响应，改写页面中的 GitHub 链接指向代理
    const contentType = responseHeaders.get("Content-Type") || "";
    if (contentType.includes("text/html")) {
      let body = await response.text();
      const proxyOrigin = url.origin;

      // 改写常见的 GitHub 绝对链接
      for (const host of allowedHosts) {
        body = body.replaceAll(
          `https://${host}`,
          `${proxyOrigin}/https://${host}`
        );
        body = body.replaceAll(
          `http://${host}`,
          `${proxyOrigin}/https://${host}`
        );
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
  },
};
