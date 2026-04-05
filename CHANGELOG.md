# Changelog

## 1.1.0

- Add Git LFS proxy support: rewrite `href` URLs in LFS batch API responses so that object downloads go through the proxy
- Add `github-cloud.githubusercontent.com` and `github-cloud.s3.amazonaws.com` to the allowed hosts list

## 1.0.0

- Initial release
- Proxy GitHub web pages, git clone, raw files, and release downloads via Cloudflare Workers
- Cookie-based short path redirect for GitHub SPA compatibility
- URL rewriting for HTML responses
- Redirect rewriting for allowed GitHub domains
