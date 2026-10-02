// vite.config.ts
import { defineConfig } from "file:///C:/Users/USER/Downloads/THINKTANK/svg_15_08_26_9h11/svg_15_08_26_9h11/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/USER/Downloads/THINKTANK/svg_15_08_26_9h11/svg_15_08_26_9h11/node_modules/@vitejs/plugin-react-swc/index.js";
import tailwindcss from "file:///C:/Users/USER/Downloads/THINKTANK/svg_15_08_26_9h11/svg_15_08_26_9h11/node_modules/@tailwindcss/vite/dist/index.mjs";
import fs from "node:fs/promises";
import nodePath from "node:path";
import { componentTagger } from "file:///C:/Users/USER/Downloads/THINKTANK/svg_15_08_26_9h11/svg_15_08_26_9h11/node_modules/lovable-tagger/dist/index.js";
import path from "path";
import { parse } from "file:///C:/Users/USER/Downloads/THINKTANK/svg_15_08_26_9h11/svg_15_08_26_9h11/node_modules/@babel/parser/lib/index.js";
import _traverse from "file:///C:/Users/USER/Downloads/THINKTANK/svg_15_08_26_9h11/svg_15_08_26_9h11/node_modules/@babel/traverse/lib/index.js";
import _generate from "file:///C:/Users/USER/Downloads/THINKTANK/svg_15_08_26_9h11/svg_15_08_26_9h11/node_modules/@babel/generator/lib/index.js";
import * as t from "file:///C:/Users/USER/Downloads/THINKTANK/svg_15_08_26_9h11/svg_15_08_26_9h11/node_modules/@babel/types/lib/index.js";
var __vite_injected_original_dirname = "C:\\Users\\USER\\Downloads\\THINKTANK\\svg_15_08_26_9h11\\svg_15_08_26_9h11";
var traverse = _traverse.default ?? _traverse;
var generate = _generate.default ?? _generate;
function cdnPrefixImages() {
  const DEBUG = process.env.CDN_IMG_DEBUG === "1";
  let publicDir = "";
  const imageSet = /* @__PURE__ */ new Set();
  const isAbsolute = (p) => /^(?:[a-z]+:)?\/\//i.test(p) || p.startsWith("data:") || p.startsWith("blob:");
  const normalizeRef = (p) => {
    let s = p.trim();
    if (isAbsolute(s)) return s;
    s = s.replace(/^(\.\/)+/, "");
    while (s.startsWith("../")) s = s.slice(3);
    if (s.startsWith("/")) s = s.slice(1);
    if (!s.startsWith("images/")) return p;
    return "/" + s;
  };
  const toCDN = (p, cdn) => {
    const n = normalizeRef(p);
    if (isAbsolute(n)) return n;
    if (!n.startsWith("/images/")) return p;
    if (!imageSet.has(n)) return p;
    const base = cdn.endsWith("/") ? cdn : cdn + "/";
    return base + n.slice(1);
  };
  const rewriteSrcsetList = (value, cdn) => value.split(",").map((part) => {
    const [url, desc] = part.trim().split(/\s+/, 2);
    const out = toCDN(url, cdn);
    return desc ? `${out} ${desc}` : out;
  }).join(", ");
  const rewriteHtml = (html, cdn) => {
    html = html.replace(
      /(src|href)\s*=\s*(['"])([^'"]+)\2/g,
      (_m, k, q, p) => `${k}=${q}${toCDN(p, cdn)}${q}`
    );
    html = html.replace(
      /(srcset)\s*=\s*(['"])([^'"]+)\2/g,
      (_m, k, q, list) => `${k}=${q}${rewriteSrcsetList(list, cdn)}${q}`
    );
    return html;
  };
  const rewriteCssUrls = (code, cdn) => code.replace(/url\((['"]?)([^'")]+)\1\)/g, (_m, q, p) => `url(${q}${toCDN(p, cdn)}${q})`);
  const rewriteJsxAst = (code, id, cdn) => {
    const ast = parse(code, { sourceType: "module", plugins: ["typescript", "jsx"] });
    let rewrites = 0;
    traverse(ast, {
      JSXAttribute(path2) {
        const name = path2.node.name.name;
        const isSrc = name === "src" || name === "href";
        const isSrcSet = name === "srcSet" || name === "srcset";
        if (!isSrc && !isSrcSet) return;
        const val = path2.node.value;
        if (!val) return;
        if (t.isStringLiteral(val)) {
          const before = val.value;
          val.value = isSrc ? toCDN(val.value, cdn) : rewriteSrcsetList(val.value, cdn);
          if (val.value !== before) rewrites++;
          return;
        }
        if (t.isJSXExpressionContainer(val) && t.isStringLiteral(val.expression)) {
          const before = val.expression.value;
          val.expression.value = isSrc ? toCDN(val.expression.value, cdn) : rewriteSrcsetList(val.expression.value, cdn);
          if (val.expression.value !== before) rewrites++;
        }
      },
      StringLiteral(path2) {
        if (t.isObjectProperty(path2.parent) && path2.parentKey === "key" && !path2.parent.computed) return;
        if (t.isImportDeclaration(path2.parent) || t.isExportAllDeclaration(path2.parent) || t.isExportNamedDeclaration(path2.parent)) return;
        if (path2.findParent((p) => p.isJSXAttribute())) return;
        const before = path2.node.value;
        const after = toCDN(before, cdn);
        if (after !== before) {
          path2.node.value = after;
          rewrites++;
        }
      },
      TemplateLiteral(path2) {
        if (path2.node.expressions.length) return;
        const raw = path2.node.quasis.map((q) => q.value.cooked ?? q.value.raw).join("");
        const after = toCDN(raw, cdn);
        if (after !== raw) {
          path2.replaceWith(t.stringLiteral(after));
          rewrites++;
        }
      }
    });
    if (!rewrites) return null;
    const out = generate(ast, { retainLines: true, sourceMaps: false }, code).code;
    if (DEBUG) console.log(`[cdn] ${id} \u2192 ${rewrites} rewrites`);
    return out;
  };
  async function collectPublicImagesFrom(dir) {
    const imagesDir = nodePath.join(dir, "images");
    const stack = [imagesDir];
    while (stack.length) {
      const cur = stack.pop();
      let entries = [];
      try {
        entries = await fs.readdir(cur, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const ent of entries) {
        const full = nodePath.join(cur, ent.name);
        if (ent.isDirectory()) {
          stack.push(full);
        } else if (ent.isFile()) {
          const rel = nodePath.relative(dir, full).split(nodePath.sep).join("/");
          const canonical = "/" + rel;
          imageSet.add(canonical);
          imageSet.add(canonical.slice(1));
        }
      }
    }
  }
  return {
    name: "cdn-prefix-images-existing",
    apply: "build",
    enforce: "pre",
    // run before @vitejs/plugin-react
    configResolved(cfg) {
      publicDir = cfg.publicDir;
      if (DEBUG) console.log("[cdn] publicDir =", publicDir);
    },
    async buildStart() {
      await collectPublicImagesFrom(publicDir);
      if (DEBUG) console.log("[cdn] images found:", imageSet.size);
    },
    transformIndexHtml(html) {
      const cdn = process.env.CDN_IMG_PREFIX;
      if (!cdn) return html;
      const out = rewriteHtml(html, cdn);
      if (DEBUG) console.log("[cdn] transformIndexHtml done");
      return out;
    },
    transform(code, id) {
      const cdn = process.env.CDN_IMG_PREFIX;
      if (!cdn) return null;
      if (/\.(jsx|tsx)$/.test(id)) {
        const out = rewriteJsxAst(code, id, cdn);
        return out ? { code: out, map: null } : null;
      }
      if (/\.(css|scss|sass|less|styl)$/i.test(id)) {
        const out = rewriteCssUrls(code, cdn);
        return out === code ? null : { code: out, map: null };
      }
      return null;
    }
  };
}
var vite_config_default = defineConfig(({ mode }) => {
  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true
        }
      }
    },
    plugins: [
      tailwindcss(),
      react(),
      mode === "development" && componentTagger(),
      cdnPrefixImages()
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src"),
        // Proxy react-router-dom to our wrapper
        "react-router-dom": path.resolve(__vite_injected_original_dirname, "./src/lib/react-router-dom-proxy.tsx"),
        // Original react-router-dom under a different name
        "react-router-dom-original": "react-router-dom"
      }
    },
    define: {
      // Define environment variables for build-time configuration
      // In production, this will be false by default unless explicitly set to 'true'
      // In development and test, this will be true by default
      __ROUTE_MESSAGING_ENABLED__: JSON.stringify(
        mode === "production" ? process.env.VITE_ENABLE_ROUTE_MESSAGING === "true" : process.env.VITE_ENABLE_ROUTE_MESSAGING !== "false"
      )
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxVU0VSXFxcXERvd25sb2Fkc1xcXFxUSElOS1RBTktcXFxcc3ZnXzE1XzA4XzI2XzloMTFcXFxcc3ZnXzE1XzA4XzI2XzloMTFcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXFVTRVJcXFxcRG93bmxvYWRzXFxcXFRISU5LVEFOS1xcXFxzdmdfMTVfMDhfMjZfOWgxMVxcXFxzdmdfMTVfMDhfMjZfOWgxMVxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvVVNFUi9Eb3dubG9hZHMvVEhJTktUQU5LL3N2Z18xNV8wOF8yNl85aDExL3N2Z18xNV8wOF8yNl85aDExL3ZpdGUuY29uZmlnLnRzXCI7Ly8gdml0ZS5jb25maWcudHNcbmltcG9ydCB7IGRlZmluZUNvbmZpZywgdHlwZSBQbHVnaW4gfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2MnO1xuaW1wb3J0IHRhaWx3aW5kY3NzIGZyb20gJ0B0YWlsd2luZGNzcy92aXRlJztcbmltcG9ydCBmcyBmcm9tICdub2RlOmZzL3Byb21pc2VzJztcbmltcG9ydCBub2RlUGF0aCBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSAnbG92YWJsZS10YWdnZXInO1xuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcblxuaW1wb3J0IHsgcGFyc2UgfSBmcm9tICdAYmFiZWwvcGFyc2VyJztcbmltcG9ydCBfdHJhdmVyc2UgZnJvbSAnQGJhYmVsL3RyYXZlcnNlJztcbmltcG9ydCBfZ2VuZXJhdGUgZnJvbSAnQGJhYmVsL2dlbmVyYXRvcic7XG5pbXBvcnQgKiBhcyB0IGZyb20gJ0BiYWJlbC90eXBlcyc7XG5cblxuLy8gQ0pTL0VTTSBpbnRlcm9wIGZvciBCYWJlbCBsaWJzXG5jb25zdCB0cmF2ZXJzZTogdHlwZW9mIF90cmF2ZXJzZS5kZWZhdWx0ID0gKCAoX3RyYXZlcnNlIGFzIGFueSkuZGVmYXVsdCA/PyBfdHJhdmVyc2UgKSBhcyBhbnk7XG5jb25zdCBnZW5lcmF0ZTogdHlwZW9mIF9nZW5lcmF0ZS5kZWZhdWx0ID0gKCAoX2dlbmVyYXRlIGFzIGFueSkuZGVmYXVsdCA/PyBfZ2VuZXJhdGUgKSBhcyBhbnk7XG5cbmZ1bmN0aW9uIGNkblByZWZpeEltYWdlcygpOiBQbHVnaW4ge1xuICBjb25zdCBERUJVRyA9IHByb2Nlc3MuZW52LkNETl9JTUdfREVCVUcgPT09ICcxJztcbiAgbGV0IHB1YmxpY0RpciA9ICcnOyAgICAgICAgICAgICAgLy8gYWJzb2x1dGUgcGF0aCB0byBWaXRlIHB1YmxpYyBkaXJcbiAgY29uc3QgaW1hZ2VTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTsgLy8gc3RvcmVzIG5vcm1hbGl6ZWQgJy9pbWFnZXMvLi4uJyBwYXRoc1xuXG4gIGNvbnN0IGlzQWJzb2x1dGUgPSAocDogc3RyaW5nKSA9PlxuICAgIC9eKD86W2Etel0rOik/XFwvXFwvL2kudGVzdChwKSB8fCBwLnN0YXJ0c1dpdGgoJ2RhdGE6JykgfHwgcC5zdGFydHNXaXRoKCdibG9iOicpO1xuXG4gIC8vIG5vcm1hbGl6ZSBhIHJlZiBsaWtlICcuL2ltYWdlcy94LnBuZycsICcuLi9pbWFnZXMveC5wbmcnLCAnL2ltYWdlcy94LnBuZycgLT4gJy9pbWFnZXMveC5wbmcnXG4gIGNvbnN0IG5vcm1hbGl6ZVJlZiA9IChwOiBzdHJpbmcpID0+IHtcbiAgICBsZXQgcyA9IHAudHJpbSgpO1xuICAgIC8vIHF1aWNrIGJhaWwtb3V0c1xuICAgIGlmIChpc0Fic29sdXRlKHMpKSByZXR1cm4gcztcbiAgICAvLyBzdHJpcCBsZWFkaW5nIC4vIGFuZCBhbnkgLi4vIHNlZ21lbnRzICh3ZSB0cmVhdCBwdWJsaWMvIGFzIHJvb3QgYXQgcnVudGltZSlcbiAgICBzID0gcy5yZXBsYWNlKC9eKFxcLlxcLykrLywgJycpO1xuICAgIHdoaWxlIChzLnN0YXJ0c1dpdGgoJy4uLycpKSBzID0gcy5zbGljZSgzKTtcbiAgICBpZiAocy5zdGFydHNXaXRoKCcvJykpIHMgPSBzLnNsaWNlKDEpO1xuICAgIC8vIGVuc3VyZSBpdCBzdGFydHMgd2l0aCBpbWFnZXMvXG4gICAgaWYgKCFzLnN0YXJ0c1dpdGgoJ2ltYWdlcy8nKSkgcmV0dXJuIHA7IC8vIG5vdCB1bmRlciBpbWFnZXMgXHUyMTkyIGxlYXZlIGFzIGlzXG4gICAgcmV0dXJuICcvJyArIHM7IC8vIGNhbm9uaWNhbDogJy9pbWFnZXMvLi4uJ1xuICB9O1xuXG4gIGNvbnN0IHRvQ0ROID0gKHA6IHN0cmluZywgY2RuOiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBuID0gbm9ybWFsaXplUmVmKHApO1xuICAgIGlmIChpc0Fic29sdXRlKG4pKSByZXR1cm4gbjtcbiAgICBpZiAoIW4uc3RhcnRzV2l0aCgnL2ltYWdlcy8nKSkgcmV0dXJuIHA7ICAgICAgICAgICAvLyBub3Qgb3VyIGZvbGRlclxuICAgIGlmICghaW1hZ2VTZXQuaGFzKG4pKSByZXR1cm4gcDsgICAgICAgICAgICAgICAgICAgIC8vIG5vdCBhbiBleGlzdGluZyBmaWxlXG4gICAgY29uc3QgYmFzZSA9IGNkbi5lbmRzV2l0aCgnLycpID8gY2RuIDogY2RuICsgJy8nO1xuICAgIHJldHVybiBiYXNlICsgbi5zbGljZSgxKTsgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICdodHRwczovL2Nkbi8uLi4vaW1hZ2VzLy4uJ1xuICB9O1xuXG4gIGNvbnN0IHJld3JpdGVTcmNzZXRMaXN0ID0gKHZhbHVlOiBzdHJpbmcsIGNkbjogc3RyaW5nKSA9PlxuICAgIHZhbHVlXG4gICAgICAuc3BsaXQoJywnKVxuICAgICAgLm1hcCgocGFydCkgPT4ge1xuICAgICAgICBjb25zdCBbdXJsLCBkZXNjXSA9IHBhcnQudHJpbSgpLnNwbGl0KC9cXHMrLywgMik7XG4gICAgICAgIGNvbnN0IG91dCA9IHRvQ0ROKHVybCwgY2RuKTtcbiAgICAgICAgcmV0dXJuIGRlc2MgPyBgJHtvdXR9ICR7ZGVzY31gIDogb3V0O1xuICAgICAgfSlcbiAgICAgIC5qb2luKCcsICcpO1xuXG4gIGNvbnN0IHJld3JpdGVIdG1sID0gKGh0bWw6IHN0cmluZywgY2RuOiBzdHJpbmcpID0+IHtcbiAgICAvLyBzcmMgLyBocmVmXG4gICAgaHRtbCA9IGh0bWwucmVwbGFjZShcbiAgICAgIC8oc3JjfGhyZWYpXFxzKj1cXHMqKFsnXCJdKShbXidcIl0rKVxcMi9nLFxuICAgICAgKF9tLCBrLCBxLCBwKSA9PiBgJHtrfT0ke3F9JHt0b0NETihwLCBjZG4pfSR7cX1gXG4gICAgKTtcbiAgICAvLyBzcmNzZXRcbiAgICBodG1sID0gaHRtbC5yZXBsYWNlKFxuICAgICAgLyhzcmNzZXQpXFxzKj1cXHMqKFsnXCJdKShbXidcIl0rKVxcMi9nLFxuICAgICAgKF9tLCBrLCBxLCBsaXN0KSA9PiBgJHtrfT0ke3F9JHtyZXdyaXRlU3Jjc2V0TGlzdChsaXN0LCBjZG4pfSR7cX1gXG4gICAgKTtcbiAgICByZXR1cm4gaHRtbDtcbiAgfTtcblxuICBjb25zdCByZXdyaXRlQ3NzVXJscyA9IChjb2RlOiBzdHJpbmcsIGNkbjogc3RyaW5nKSA9PlxuICAgIGNvZGUucmVwbGFjZSgvdXJsXFwoKFsnXCJdPykoW14nXCIpXSspXFwxXFwpL2csIChfbSwgcSwgcCkgPT4gYHVybCgke3F9JHt0b0NETihwLCBjZG4pfSR7cX0pYCk7XG5cbiAgY29uc3QgcmV3cml0ZUpzeEFzdCA9IChjb2RlOiBzdHJpbmcsIGlkOiBzdHJpbmcsIGNkbjogc3RyaW5nKSA9PiB7XG4gICAgY29uc3QgYXN0ID0gcGFyc2UoY29kZSwgeyBzb3VyY2VUeXBlOiAnbW9kdWxlJywgcGx1Z2luczogWyd0eXBlc2NyaXB0JywgJ2pzeCddIH0pO1xuICAgIGxldCByZXdyaXRlcyA9IDA7XG5cbiAgICB0cmF2ZXJzZShhc3QsIHtcbiAgICAgIEpTWEF0dHJpYnV0ZShwYXRoKSB7XG4gICAgICAgIGNvbnN0IG5hbWUgPSAocGF0aC5ub2RlLm5hbWUgYXMgdC5KU1hJZGVudGlmaWVyKS5uYW1lO1xuICAgICAgICBjb25zdCBpc1NyYyA9IG5hbWUgPT09ICdzcmMnIHx8IG5hbWUgPT09ICdocmVmJztcbiAgICAgICAgY29uc3QgaXNTcmNTZXQgPSBuYW1lID09PSAnc3JjU2V0JyB8fCBuYW1lID09PSAnc3Jjc2V0JztcbiAgICAgICAgaWYgKCFpc1NyYyAmJiAhaXNTcmNTZXQpIHJldHVybjtcblxuICAgICAgICBjb25zdCB2YWwgPSBwYXRoLm5vZGUudmFsdWU7XG4gICAgICAgIGlmICghdmFsKSByZXR1cm47XG5cbiAgICAgICAgaWYgKHQuaXNTdHJpbmdMaXRlcmFsKHZhbCkpIHtcbiAgICAgICAgICBjb25zdCBiZWZvcmUgPSB2YWwudmFsdWU7XG4gICAgICAgICAgdmFsLnZhbHVlID0gaXNTcmMgPyB0b0NETih2YWwudmFsdWUsIGNkbikgOiByZXdyaXRlU3Jjc2V0TGlzdCh2YWwudmFsdWUsIGNkbik7XG4gICAgICAgICAgaWYgKHZhbC52YWx1ZSAhPT0gYmVmb3JlKSByZXdyaXRlcysrO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodC5pc0pTWEV4cHJlc3Npb25Db250YWluZXIodmFsKSAmJiB0LmlzU3RyaW5nTGl0ZXJhbCh2YWwuZXhwcmVzc2lvbikpIHtcbiAgICAgICAgICBjb25zdCBiZWZvcmUgPSB2YWwuZXhwcmVzc2lvbi52YWx1ZTtcbiAgICAgICAgICB2YWwuZXhwcmVzc2lvbi52YWx1ZSA9IGlzU3JjXG4gICAgICAgICAgICA/IHRvQ0ROKHZhbC5leHByZXNzaW9uLnZhbHVlLCBjZG4pXG4gICAgICAgICAgICA6IHJld3JpdGVTcmNzZXRMaXN0KHZhbC5leHByZXNzaW9uLnZhbHVlLCBjZG4pO1xuICAgICAgICAgIGlmICh2YWwuZXhwcmVzc2lvbi52YWx1ZSAhPT0gYmVmb3JlKSByZXdyaXRlcysrO1xuICAgICAgICB9XG4gICAgICB9LFxuXG4gICAgICBTdHJpbmdMaXRlcmFsKHBhdGgpIHtcbiAgICAgICAgLy8gc2tpcCBvYmplY3Qga2V5czogeyBcImltYWdlXCI6IFwiLi4uXCIgfVxuICAgICAgICBpZiAodC5pc09iamVjdFByb3BlcnR5KHBhdGgucGFyZW50KSAmJiBwYXRoLnBhcmVudEtleSA9PT0gJ2tleScgJiYgIXBhdGgucGFyZW50LmNvbXB1dGVkKSByZXR1cm47XG4gICAgICAgIC8vIHNraXAgaW1wb3J0L2V4cG9ydCBzb3VyY2VzXG4gICAgICAgIGlmICh0LmlzSW1wb3J0RGVjbGFyYXRpb24ocGF0aC5wYXJlbnQpIHx8IHQuaXNFeHBvcnRBbGxEZWNsYXJhdGlvbihwYXRoLnBhcmVudCkgfHwgdC5pc0V4cG9ydE5hbWVkRGVjbGFyYXRpb24ocGF0aC5wYXJlbnQpKSByZXR1cm47XG4gICAgICAgIC8vIHNraXAgaW5zaWRlIEpTWCBhdHRyaWJ1dGUgKGFscmVhZHkgaGFuZGxlZClcbiAgICAgICAgaWYgKHBhdGguZmluZFBhcmVudChwID0+IHAuaXNKU1hBdHRyaWJ1dGUoKSkpIHJldHVybjtcblxuICAgICAgICBjb25zdCBiZWZvcmUgPSBwYXRoLm5vZGUudmFsdWU7XG4gICAgICAgIGNvbnN0IGFmdGVyID0gdG9DRE4oYmVmb3JlLCBjZG4pO1xuICAgICAgICBpZiAoYWZ0ZXIgIT09IGJlZm9yZSkgeyBwYXRoLm5vZGUudmFsdWUgPSBhZnRlcjsgcmV3cml0ZXMrKzsgfVxuICAgICAgfSxcblxuICAgICAgVGVtcGxhdGVMaXRlcmFsKHBhdGgpIHtcbiAgICAgICAgLy8gaGFuZGxlIGBcIi9pbWFnZXMvZm9vLnBuZ1wiYCBhcyB0ZW1wbGF0ZSB3aXRoIE5PIGV4cHJlc3Npb25zXG4gICAgICAgIGlmIChwYXRoLm5vZGUuZXhwcmVzc2lvbnMubGVuZ3RoKSByZXR1cm47XG4gICAgICAgIGNvbnN0IHJhdyA9IHBhdGgubm9kZS5xdWFzaXMubWFwKHEgPT4gcS52YWx1ZS5jb29rZWQgPz8gcS52YWx1ZS5yYXcpLmpvaW4oJycpO1xuICAgICAgICBjb25zdCBhZnRlciA9IHRvQ0ROKHJhdywgY2RuKTtcbiAgICAgICAgaWYgKGFmdGVyICE9PSByYXcpIHtcbiAgICAgICAgICBwYXRoLnJlcGxhY2VXaXRoKHQuc3RyaW5nTGl0ZXJhbChhZnRlcikpO1xuICAgICAgICAgIHJld3JpdGVzKys7XG4gICAgICAgIH1cbiAgICAgIH0sXG5cbiAgICB9KTtcblxuICAgIGlmICghcmV3cml0ZXMpIHJldHVybiBudWxsO1xuICAgIGNvbnN0IG91dCA9IGdlbmVyYXRlKGFzdCwgeyByZXRhaW5MaW5lczogdHJ1ZSwgc291cmNlTWFwczogZmFsc2UgfSwgY29kZSkuY29kZTtcbiAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKGBbY2RuXSAke2lkfSBcdTIxOTIgJHtyZXdyaXRlc30gcmV3cml0ZXNgKTtcbiAgICByZXR1cm4gb3V0O1xuICB9O1xuXG4gIGFzeW5jIGZ1bmN0aW9uIGNvbGxlY3RQdWJsaWNJbWFnZXNGcm9tKGRpcjogc3RyaW5nKSB7XG4gICAgLy8gUmVjdXJzaXZlbHkgY29sbGVjdCBldmVyeSBmaWxlIHVuZGVyIHB1YmxpYy9pbWFnZXMgaW50byBpbWFnZVNldCBhcyAnL2ltYWdlcy9yZWxwYXRoJ1xuICAgIGNvbnN0IGltYWdlc0RpciA9IG5vZGVQYXRoLmpvaW4oZGlyLCAnaW1hZ2VzJyk7XG4gICAgY29uc3Qgc3RhY2sgPSBbaW1hZ2VzRGlyXTtcbiAgICB3aGlsZSAoc3RhY2subGVuZ3RoKSB7XG4gICAgICBjb25zdCBjdXIgPSBzdGFjay5wb3AoKSE7XG4gICAgICBsZXQgZW50cmllczogYW55W10gPSBbXTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGVudHJpZXMgPSBhd2FpdCBmcy5yZWFkZGlyKGN1ciwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIGNvbnRpbnVlOyAvLyBpbWFnZXMvIG1heSBub3QgZXhpc3RcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgZW50IG9mIGVudHJpZXMpIHtcbiAgICAgICAgY29uc3QgZnVsbCA9IG5vZGVQYXRoLmpvaW4oY3VyLCBlbnQubmFtZSk7XG4gICAgICAgIGlmIChlbnQuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICAgIHN0YWNrLnB1c2goZnVsbCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZW50LmlzRmlsZSgpKSB7XG4gICAgICAgICAgY29uc3QgcmVsID0gbm9kZVBhdGgucmVsYXRpdmUoZGlyLCBmdWxsKS5zcGxpdChub2RlUGF0aC5zZXApLmpvaW4oJy8nKTtcbiAgICAgICAgICBjb25zdCBjYW5vbmljYWwgPSAnLycgKyByZWw7IC8vICcvaW1hZ2VzLy4uLidcbiAgICAgICAgICBpbWFnZVNldC5hZGQoY2Fub25pY2FsKTtcbiAgICAgICAgICAvLyBhbHNvIGFkZCB2YXJpYW50IHdpdGhvdXQgbGVhZGluZyBzbGFzaCBmb3Igc2FmZXR5XG4gICAgICAgICAgaW1hZ2VTZXQuYWRkKGNhbm9uaWNhbC5zbGljZSgxKSk7IC8vICdpbWFnZXMvLi4uJ1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBuYW1lOiAnY2RuLXByZWZpeC1pbWFnZXMtZXhpc3RpbmcnLFxuICAgIGFwcGx5OiAnYnVpbGQnLFxuICAgIGVuZm9yY2U6ICdwcmUnLCAvLyBydW4gYmVmb3JlIEB2aXRlanMvcGx1Z2luLXJlYWN0XG5cbiAgICBjb25maWdSZXNvbHZlZChjZmcpIHtcbiAgICAgIHB1YmxpY0RpciA9IGNmZy5wdWJsaWNEaXI7IC8vIGFic29sdXRlXG4gICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKCdbY2RuXSBwdWJsaWNEaXIgPScsIHB1YmxpY0Rpcik7XG4gICAgfSxcblxuICAgIGFzeW5jIGJ1aWxkU3RhcnQoKSB7XG4gICAgICBhd2FpdCBjb2xsZWN0UHVibGljSW1hZ2VzRnJvbShwdWJsaWNEaXIpO1xuICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZygnW2Nkbl0gaW1hZ2VzIGZvdW5kOicsIGltYWdlU2V0LnNpemUpO1xuICAgIH0sXG5cbiAgICB0cmFuc2Zvcm1JbmRleEh0bWwoaHRtbCkge1xuICAgICAgY29uc3QgY2RuID0gcHJvY2Vzcy5lbnYuQ0ROX0lNR19QUkVGSVg7XG4gICAgICBpZiAoIWNkbikgcmV0dXJuIGh0bWw7XG4gICAgICBjb25zdCBvdXQgPSByZXdyaXRlSHRtbChodG1sLCBjZG4pO1xuICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZygnW2Nkbl0gdHJhbnNmb3JtSW5kZXhIdG1sIGRvbmUnKTtcbiAgICAgIHJldHVybiBvdXQ7XG4gICAgfSxcblxuICAgIHRyYW5zZm9ybShjb2RlLCBpZCkge1xuICAgICAgY29uc3QgY2RuID0gcHJvY2Vzcy5lbnYuQ0ROX0lNR19QUkVGSVg7XG4gICAgICBpZiAoIWNkbikgcmV0dXJuIG51bGw7XG5cbiAgICAgIGlmICgvXFwuKGpzeHx0c3gpJC8udGVzdChpZCkpIHtcbiAgICAgICAgY29uc3Qgb3V0ID0gcmV3cml0ZUpzeEFzdChjb2RlLCBpZCwgY2RuKTtcbiAgICAgICAgcmV0dXJuIG91dCA/IHsgY29kZTogb3V0LCBtYXA6IG51bGwgfSA6IG51bGw7XG4gICAgICB9XG5cbiAgICAgIGlmICgvXFwuKGNzc3xzY3NzfHNhc3N8bGVzc3xzdHlsKSQvaS50ZXN0KGlkKSkge1xuICAgICAgICBjb25zdCBvdXQgPSByZXdyaXRlQ3NzVXJscyhjb2RlLCBjZG4pO1xuICAgICAgICByZXR1cm4gb3V0ID09PSBjb2RlID8gbnVsbCA6IHsgY29kZTogb3V0LCBtYXA6IG51bGwgfTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSxcbiAgfTtcbn1cblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcbiAgcmV0dXJuIHtcbiAgICBzZXJ2ZXI6IHtcbiAgICAgIGhvc3Q6IFwiOjpcIixcbiAgICAgIHBvcnQ6IDgwODAsXG4gICAgICBwcm94eToge1xuICAgICAgICAnL2FwaSc6IHtcbiAgICAgICAgICB0YXJnZXQ6ICdodHRwOi8vMTI3LjAuMC4xOjgwMDAnLFxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgcGx1Z2luczogW1xuICAgICAgdGFpbHdpbmRjc3MoKSxcbiAgICAgIHJlYWN0KCksXG4gICAgICBtb2RlID09PSAnZGV2ZWxvcG1lbnQnICYmXG4gICAgICBjb21wb25lbnRUYWdnZXIoKSxcbiAgICAgIGNkblByZWZpeEltYWdlcygpLFxuICAgIF0uZmlsdGVyKEJvb2xlYW4pLFxuICAgIHJlc29sdmU6IHtcbiAgICAgIGFsaWFzOiB7XG4gICAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxuICAgICAgICAvLyBQcm94eSByZWFjdC1yb3V0ZXItZG9tIHRvIG91ciB3cmFwcGVyXG4gICAgICAgIFwicmVhY3Qtcm91dGVyLWRvbVwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjL2xpYi9yZWFjdC1yb3V0ZXItZG9tLXByb3h5LnRzeFwiKSxcbiAgICAgICAgLy8gT3JpZ2luYWwgcmVhY3Qtcm91dGVyLWRvbSB1bmRlciBhIGRpZmZlcmVudCBuYW1lXG4gICAgICAgIFwicmVhY3Qtcm91dGVyLWRvbS1vcmlnaW5hbFwiOiBcInJlYWN0LXJvdXRlci1kb21cIixcbiAgICAgIH0sXG4gICAgfSxcbiAgICBkZWZpbmU6IHtcbiAgICAgIC8vIERlZmluZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZm9yIGJ1aWxkLXRpbWUgY29uZmlndXJhdGlvblxuICAgICAgLy8gSW4gcHJvZHVjdGlvbiwgdGhpcyB3aWxsIGJlIGZhbHNlIGJ5IGRlZmF1bHQgdW5sZXNzIGV4cGxpY2l0bHkgc2V0IHRvICd0cnVlJ1xuICAgICAgLy8gSW4gZGV2ZWxvcG1lbnQgYW5kIHRlc3QsIHRoaXMgd2lsbCBiZSB0cnVlIGJ5IGRlZmF1bHRcbiAgICAgIF9fUk9VVEVfTUVTU0FHSU5HX0VOQUJMRURfXzogSlNPTi5zdHJpbmdpZnkoXG4gICAgICAgIG1vZGUgPT09ICdwcm9kdWN0aW9uJyBcbiAgICAgICAgICA/IHByb2Nlc3MuZW52LlZJVEVfRU5BQkxFX1JPVVRFX01FU1NBR0lORyA9PT0gJ3RydWUnXG4gICAgICAgICAgOiBwcm9jZXNzLmVudi5WSVRFX0VOQUJMRV9ST1VURV9NRVNTQUdJTkcgIT09ICdmYWxzZSdcbiAgICAgICksXG4gICAgfSxcbiAgfVxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQ0EsU0FBUyxvQkFBaUM7QUFDMUMsT0FBTyxXQUFXO0FBQ2xCLE9BQU8saUJBQWlCO0FBQ3hCLE9BQU8sUUFBUTtBQUNmLE9BQU8sY0FBYztBQUNyQixTQUFTLHVCQUF1QjtBQUNoQyxPQUFPLFVBQVU7QUFFakIsU0FBUyxhQUFhO0FBQ3RCLE9BQU8sZUFBZTtBQUN0QixPQUFPLGVBQWU7QUFDdEIsWUFBWSxPQUFPO0FBWm5CLElBQU0sbUNBQW1DO0FBZ0J6QyxJQUFNLFdBQXdDLFVBQWtCLFdBQVc7QUFDM0UsSUFBTSxXQUF3QyxVQUFrQixXQUFXO0FBRTNFLFNBQVMsa0JBQTBCO0FBQ2pDLFFBQU0sUUFBUSxRQUFRLElBQUksa0JBQWtCO0FBQzVDLE1BQUksWUFBWTtBQUNoQixRQUFNLFdBQVcsb0JBQUksSUFBWTtBQUVqQyxRQUFNLGFBQWEsQ0FBQyxNQUNsQixxQkFBcUIsS0FBSyxDQUFDLEtBQUssRUFBRSxXQUFXLE9BQU8sS0FBSyxFQUFFLFdBQVcsT0FBTztBQUcvRSxRQUFNLGVBQWUsQ0FBQyxNQUFjO0FBQ2xDLFFBQUksSUFBSSxFQUFFLEtBQUs7QUFFZixRQUFJLFdBQVcsQ0FBQyxFQUFHLFFBQU87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
