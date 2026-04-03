<h1 align="center">GitHub 代理</h1>
<p align="center"><a href="README_EN.md">English</a></p>

利用 Cloudflare Workers 代理 GitHub，加速访问和 git clone。

## 用法

在任意 GitHub 链接前加上你的自定义域名（例如`gh.example.com`）即可：

- **网页加速**: `https://gh.example.com/https://github.com/root-project/root`
- **Git Clone**: `git clone https://gh.example.com/https://github.com/root-project/root.git`
- **Raw 文件**: `https://gh.example.com/https://raw.githubusercontent.com/user/repo/main/file.txt`
- **Release 下载**: `https://gh.example.com/https://github.com/user/repo/releases/download/v1.0/file.tar.gz`

## 支持的 GitHub 域名

详见源码中的 [`ALLOWED_HOSTS`](src/index.js#L4)。

## 部署

### Cloudflare Workers Builds

1. Fork 本仓库到你的 GitHub 账号
2. 在 Cloudflare Dashboard 中进入 Workers & Pages → Create → Connect to Git
3. 选择你的仓库，框架选择 None，部署即可
4. 绑定自定义域名：Settings → Domains & Routes → Custom Domains

## 开发测试

```bash
npm install
npm run dev
```

本地开发服务器默认运行在 `http://localhost:8787`。
