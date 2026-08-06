import http from "node:http";
import https from "node:https";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDir = resolve(fileURLToPath(import.meta.url), "..");

function createStorageProxy(prefix: string) {
  return {
    name: `${prefix}-proxy`,
    configureServer(server: any) {
      server.middlewares.use(prefix, (req: any, res: any) => {
        const reqPath = req.url.slice(1);
        const firstSlash = reqPath.indexOf("/");
        if (firstSlash === -1) {
          res.statusCode = 400;
          res.end("Invalid proxy URL: " + reqPath);
          return;
        }

        const raw = reqPath.slice(0, firstSlash);
        const targetPath = reqPath.slice(firstSlash);
        const target = new URL(decodeURIComponent(raw));
        const httpModule = target.protocol === "https:" ? https : http;

        const options = {
          hostname: target.hostname,
          port: target.port || (target.protocol === "https:" ? 443 : 80),
          path: targetPath,
          method: req.method,
          headers: { ...req.headers, host: target.hostname },
        };

        const proxyReq = httpModule.request(options, (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res);
        });
        proxyReq.on("error", () => {
          res.statusCode = 502;
          res.end();
        });
        req.pipe(proxyReq);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  return {
    base: mode === "development" ? "/" : "./",
    build: {
      outDir: "image-flow",
    },
    resolve: {
      alias: {
        "@": resolve(rootDir, "src"),
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      createStorageProxy("/api/obs-proxy/"),
      createStorageProxy("/api/oss-proxy/"),
    ],
    server: {
      proxy: {
        "/api/tinypng": {
          target: "https://tinypng.com",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/tinypng/, ""),
        },
      },
    },
  };
});
