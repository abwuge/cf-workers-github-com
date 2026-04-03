# cf-workers-github-com

利用 Cloudflare Workers 代理 GitHub，加速访问和 git clone。

## 用法

在任意 GitHub 链接前加上你的自定义域名即可：

- **网页加速**: `https://gh.example.com/https://github.com/root-project/root`
- **Git Clone**: `git clone https://gh.example.com/https://github.com/root-project/root.git`
- **Raw 文件**: `https://gh.example.com/https://raw.githubusercontent.com/user/repo/main/file.txt`
- **Release 下载**: `https://gh.example.com/https://github.com/user/repo/releases/download/v1.0/file.tar.gz`

## 支持的 GitHub 域名

- `github.com`
- `raw.githubusercontent.com`
- `gist.github.com`
- `gist.githubusercontent.com`
- `github.githubassets.com`
- `objects.githubusercontent.com`
- `codeload.github.com`
- `releases.githubusercontent.com`
- `cloud.githubusercontent.com`
- `avatars.githubusercontent.com`

## 部署

### 1. 安装依赖

```bash
npm install
```

### 2. 本地开发

```bash
npm run dev
```

### 3. 部署到 Cloudflare

```bash
npm run deploy
```

### 4. 绑定自定义域名

在 Cloudflare Dashboard 中：
1. 进入 Workers & Pages → 选择此 Worker
2. Settings → Triggers → Custom Domains
3. 添加你的自定义域名（如 `gh.example.com`）

> 确保该域名已在 Cloudflare 中托管 DNS。

## CI/CD (Workers Builds)

此项目已连接 Git 仓库，推送到 `main` 分支时会自动部署。
