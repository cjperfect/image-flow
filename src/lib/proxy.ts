interface ProxyPattern {
  protocol: string;
  hostname?: string;
  hostnameSuffix?: string;
  proxyPrefix: string;
}

const proxyConfigs: ProxyPattern[] = [];

// 扩展 XMLHttpRequest 类型
declare global {
  interface XMLHttpRequest {
    open: {
      (method: string, url: string | URL, async?: boolean, username?: string | null, password?: string | null): void;
      __proxyPatched?: boolean;
    };
  }
}

export function registerProxyEndpoint(pattern: ProxyPattern): void {
  proxyConfigs.push(pattern);
  ensureXhrPatched();
}

function ensureXhrPatched(): void {
  if (XMLHttpRequest.prototype.open.__proxyPatched) return;
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ) {
    if (typeof url === 'string' && proxyConfigs.length) {
      try {
        const reqUrl = new URL(url);
        for (const pc of proxyConfigs) {
          const matches = pc.hostname
            ? reqUrl.hostname === pc.hostname || reqUrl.hostname.endsWith('.' + pc.hostname)
            : reqUrl.hostname.endsWith(pc.hostnameSuffix ?? '');

          if (matches && reqUrl.protocol === pc.protocol) {
            url = pc.proxyPrefix + encodeURIComponent(reqUrl.origin) + reqUrl.pathname + reqUrl.search;
            break;
          }
        }
      } catch {
        // 忽略无法解析的 SDK URL
      }
    }
    return originalOpen.call(this, method, url, async, username, password);
  };
  XMLHttpRequest.prototype.open.__proxyPatched = true;
}
