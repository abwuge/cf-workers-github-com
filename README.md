# cf-workers-github-com

A Cloudflare Worker that proxies GitHub for accelerated access and git clone.

## Usage

Prepend your custom domain (e.g. `gh.example.com`) to any GitHub URL:

- **Web**: `https://gh.example.com/https://github.com/user/repo`
- **Git Clone**: `git clone https://gh.example.com/https://github.com/user/repo.git`
- **Raw files**: `https://gh.example.com/https://raw.githubusercontent.com/user/repo/main/file.txt`
- **Releases**: `https://gh.example.com/https://github.com/user/repo/releases/download/v1.0/file.tar.gz`

## Supported GitHub Domains

See [`ALLOWED_HOSTS`](src/index.js#L4) in the source code.

## Deploy

### Cloudflare Workers Builds

1. Fork this repository
2. In Cloudflare Dashboard, go to Workers & Pages → Create → Connect to Git
3. Select your repo, set framework to None, and deploy
4. Bind a custom domain: Settings → Domains & Routes → Custom Domains

## Development

```bash
npm install
npm run dev
```

Local dev server runs at `http://localhost:8787`.
