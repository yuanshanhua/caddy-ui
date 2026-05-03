# Caddy UI

一个轻量级、纯静态的 Web 管理界面，通过 Admin API 管理 [Caddy](https://caddyserver.com) Web 服务器。

## 功能特点

- **零后端** — UI 是纯静态 SPA；Caddy 的配置就是唯一的数据源
- **完整的配置增删改查** — 通过可视化界面创建、编辑和删除服务器、路由和处理器
- **反向代理管理** — 配置上游地址、负载均衡策略和健康检查
- **多种处理器类型** — 反向代理、文件服务器、静态响应、重定向
- **路由编辑器** — 可视化的匹配器（host/path/method）和处理器配置
- **原始 JSON 编辑器** — 完全访问 Caddy 原始 JSON 配置，带验证功能
- **实时连接监控** — 实时指示器显示 Admin API 连接状态
- **类型安全** — 使用严格的 TypeScript 构建，完整的 Caddy 配置类型定义
- **Caddy 自托管** — Caddy 自身提供 UI 服务并代理到自己的 Admin API

## 截图

> 即将提供

## 快速开始

### 一键部署

在服务器上部署 Caddy UI 的最快方式：

```bash
curl -fsSL https://raw.githubusercontent.com/yuanshanhua/caddy-ui/master/deploy.sh | bash
```

脚本将会：

1. 检查已安装 Caddy v2.7+
2. 询问你的域名、用户名和密码
3. 从 GitHub Releases 下载最新的预构建 UI
4. 生成带 BasicAuth + 自动 HTTPS 的安全 Caddyfile
5. 自动完成所有部署

### 手动部署

如需手动部署，参见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) 获取详细步骤。

### 更新

再次运行部署脚本即可 — 它会检测到已有安装，并提供仅更新静态文件的选项，不会修改你的配置。

## 安全性

> **HTTPS 是必需的。** Caddy UI 完全依赖 Caddy 的强制 HTTPS 来保护传输中的凭据。永远不要在纯 HTTP 连接上部署 Caddy UI。

安全模型简洁而稳健：

- **HTTPS 强制** — 在 Caddyfile 中使用域名会触发 Caddy 的自动 TLS。这是保护 BasicAuth 凭据不被窃听的首要安全层。
- **BasicAuth + bcrypt** — Caddy 的 `basicauth` 中间件保护 `/ui/` 和 `/ui/api/` 两个路径。密码以 bcrypt 哈希存储，绝不以明文形式保存。
- **Admin API 隔离** — Admin API 仅绑定到 `localhost:2019`，永远不直接暴露到互联网。所有访问都通过 Caddy 的认证反向代理。
- **无自定义认证代码** — UI 本身没有任何认证逻辑。安全性完全委托给 Caddy 经过实战检验的中间件。
- **建议 IP 限制** — 如需额外加固，可在 Caddyfile 中按来源 IP 限制访问。

**重要提示：** 如果无法使用 HTTPS（例如，内网环境没有域名），你的凭据将以明文传输。在这种情况下，请确保网络完全可信或使用 VPN。

## 开发

```bash
git clone https://github.com/yuanshanhua/caddy-ui && cd caddy-ui
pnpm i
pnpm dev              # Vite 开发服务器，自动代理 API 到 localhost:2019

# 在另一个终端：
caddy run --config Caddyfile.dev
```

关于架构细节、编码规范和贡献指南，请参见：

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — 设计决策与数据流
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — 完整部署指南（手动、Docker）
- [docs/ROADMAP.md](docs/ROADMAP.md) — 规划功能

## 许可证

MIT

## 贡献

欢迎贡献！请确保：

1. `pnpm check` 通过（lint + typecheck + i18n）
2. `pnpm build` 成功

参见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) 了解设计决策和编码规范。
