# 九年级语文上册 · 六维解读

人教部编版九年级语文上册课文解读站：情节 / 人物 / 主题 / 手法 / 背景 / 多角度解读，支持分享码同步与追加「内容解读」「情境任务」。

## 在线地址

- 自定义域名：[yuwen.aixue.org](https://yuwen.aixue.org)
- Workers：`https://yuwen-jiuwen-wusi.macsetsun.workers.dev`

## 技术栈

- Cloudflare Workers（静态资源 + API）
- Cloudflare D1（分享码与用户追加内容）
- 单页应用（hash 路由）

## 本地开发

```bash
npm i -g wrangler   # 如需
npx wrangler dev
```

## 数据库

见 `schema.sql`（表结构）与 `seed.sql`（内置分享码种子数据）。

```bash
npx wrangler d1 execute yuwen-jiuwen-wusi --remote --file=./schema.sql
npx wrangler d1 execute yuwen-jiuwen-wusi --remote --file=./seed.sql
```

## 目录

```
public/index.html   # 前端页面
src/index.js        # Worker API（分享码读写）
wrangler.jsonc      # Workers / D1 / 自定义域名配置
schema.sql
seed.sql
```

## 许可

学习资料整理，仅供个人学习交流使用。
