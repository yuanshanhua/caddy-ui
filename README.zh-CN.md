# Caddy UI

一个轻量级、纯静态的 Web 管理界面，通过 Admin API 管理 [Caddy](https://caddyserver.com) Web 服务器。

**无后端。无数据库。无插件。仅一个静态 SPA，直接与 Caddy 通信。**

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

### 前置条件

- [Caddy](https://caddyserver.com/docs/install) v2.7+
- [Node.js](https://nodejs.org/) 22+ 和 [pnpm](https://pnpm.io/)（用于构建）

### 构建

```bash
git clone https://github.com/yuanshanhua/caddy-ui.git
cd caddy-ui
pnpm install
pnpm build
```

### 部署

将 `dist/` 目录复制到你的服务器，然后添加到 Caddyfile：

```caddyfile
{
  admin localhost:2019
}

your-domain.com {
  # UI 静态文件（密码保护）
  handle /ui/* {
    basicauth {
      # 生成命令: caddy hash-password
      admin $2a$14$YOUR_BCRYPT_HASH
    }
    uri strip_prefix /ui
    file_server {
      root /path/to/caddy-ui/dist
      try_files {path} /index.html
    }
  }

  # 代理 API 请求到 Admin API
  handle /ui/api/* {
    basicauth {
      admin $2a$14$YOUR_BCRYPT_HASH
    }
    uri strip_prefix /ui/api
    reverse_proxy localhost:2019
  }
}
```

重载 Caddy 后访问 `https://your-domain.com/ui/`。

### 本地开发

```bash
# 启动 Vite 开发服务器（自动代理 API 到 localhost:2019）
pnpm dev

# 在另一个终端启动 Caddy
caddy run --config Caddyfile.dev
```

## 架构

```
浏览器 → Caddy (:443)
             ├── /ui/*          → file_server（SPA 静态文件）
             ├── /ui/api/*      → reverse_proxy localhost:2019（Admin API）
             └── /*             → 你的正常站点路由
```

- SPA 通过 Caddy 的 Admin API 完成所有操作
- 认证由 Caddy 的 `basicauth` 中间件处理
- Admin API 仅监听 localhost — 不直接暴露
- 同源部署消除了 CORS 问题

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | React 19 + Vite 8 |
| 语言 | TypeScript 6（strict 模式，零 `any`） |
| 样式 | Tailwind CSS 4 |
| 组件 | shadcn/ui 模式 |
| 服务端状态 | TanStack Query v5 |
| 客户端状态 | Zustand v5 |
| 路由 | React Router v7 |
| 代码检查 | Biome |

## 安全性

- UI **没有认证逻辑** — Caddy 的 `basicauth` 保护 `/ui/` 路由
- Admin API 在 `localhost:2019` 运行，不会直接暴露
- 所有 API 访问通过 Caddy 的反向代理（同源）
- 建议添加 IP 限制以增强安全性

## 与替代方案的对比

| | Caddy UI | CaddyManager | Nginx Proxy Manager |
|---|---------|--------------|-------------------|
| 需要后端 | 否 | 是 (Express.js) | 是 (Node.js) |
| 需要数据库 | 否 | 是 (SQLite/MongoDB) | 是 (SQLite) |
| 安装方式 | 复制静态文件 | Docker/npm | Docker |
| 配置透明度 | 完全（可访问原始 JSON） | 部分 | 低 |
| Caddy 版本耦合 | 无 | 紧耦合 | 不适用 (Nginx) |
| 升级方式 | 替换文件（零停机） | 重建容器 | 重建容器 |

## 许可证

MIT

## 贡献

欢迎贡献！请确保：

1. `pnpm typecheck` 通过，零错误
2. `pnpm lint` 通过
3. `pnpm build` 成功

参见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) 了解设计决策，[docs/ROADMAP.md](docs/ROADMAP.md) 了解规划的功能。
