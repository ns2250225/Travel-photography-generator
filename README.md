# 🗺️ AI 全球旅拍生成器

这是一个基于 Vue.js 开发的 Web 应用，它结合了 OpenStreetMap 地图服务和 AI 技术。用户只需上传一张照片并在地图上选择一个地点，即可生成一张逼真的在当地旅游的照片。

## ✨ 功能特性

*   **交互式地图**: 集成 Leaflet.js 和 OpenStreetMap，提供全屏沉浸式地图体验。
*   **地点搜索**: 支持全球范围内的城市或地标搜索，并提供下拉联想。
*   **AI 智能生图**: 调用 `nano-banana-pro` 模型，根据所选地点的实时天气和时间生成极具真实感的旅拍照片。
*   **实时预览**: 上传图片即刻预览，生成进度实时反馈。
*   **一键下载**: 生成结果支持灯箱大图查看，并可直接下载高清原图。
*   **响应式 UI**: 采用现代化的玻璃拟态 (Glassmorphism) 设计风格。

## 🛠️ 技术栈

*   **前端框架**: Vue 3, Vite
*   **地图引擎**: Leaflet, OpenStreetMap, Nominatim API
*   **HTTP 请求**: Axios, Fetch API (支持流式响应)
*   **服务端 (生产环境)**: Nginx 或 Node.js (Express) 用于反向代理

## 🚀 开发指南

1.  **安装依赖**
    ```bash
    npm install
    ```

2.  **启动开发服务器**
    ```bash
    npm run dev
    ```
    访问应用: `http://localhost:5173`

    > 注意: 开发环境下的 `vite.config.js` 已经配置了 API 代理，解决了跨域 (CORS) 问题。

## 📦 生产环境部署

### 构建项目

```bash
npm run build
```
构建完成后会生成一个包含静态文件的 `dist` 目录。

### 部署方案 1: Nginx (推荐)

1.  将 `dist` 目录复制到你的 Web 服务器 (例如 `/usr/share/nginx/html`)。
2.  使用项目提供的 `nginx.conf` 配置来处理路由和 API 代理。

    **关键 Nginx 配置 (解决进度条卡顿):**
    ```nginx
    location /api/generate {
        proxy_pass https://grsai.dakka.com.cn;
        
        # 重要: 禁用缓冲以支持流式响应 (SSE)
        proxy_buffering off;
        proxy_cache off;
    }
    ```

3.  重启 Nginx: `sudo nginx -s reload`

### 部署方案 2: Node.js Server

如果你无法配置 Nginx，可以使用项目中提供的 `server.js` 来托管应用并处理代理。

1.  确保 `dist` 目录已生成。
2.  安装生产环境依赖:
    ```bash
    npm install express http-proxy-middleware
    ```
3.  启动服务器:
    ```bash
    node server.js
    ```
    应用将运行在 `http://localhost:8080`。

## ⚠️ 重要注意事项

*   **跨域 (CORS)**: 在浏览器中直接调用 `img.scdn.io` 或 AI 接口会被跨域拦截。你 **必须** 使用 Vite (开发环境) 或 Nginx/Node (生产环境) 配置的 `/api/...` 代理路径。
*   **流式响应**: AI 生成接口使用流式 JSON/SSE 返回进度。在配置反向代理 (Nginx/Apache) 时，务必 **禁用缓冲 (buffering)**，否则前端进度条将无法实时更新，只能在生成结束后直接跳到 100%。

## 📄 许可证

MIT
