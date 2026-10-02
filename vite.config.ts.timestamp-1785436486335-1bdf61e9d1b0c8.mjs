// vite.config.ts
import { defineConfig } from "file:///C:/Users/ActiveMedia/Downloads/zip_telechargement%20(3)/zip_telechargement/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/ActiveMedia/Downloads/zip_telechargement%20(3)/zip_telechargement/node_modules/@vitejs/plugin-react-swc/index.js";
import tailwindcss from "file:///C:/Users/ActiveMedia/Downloads/zip_telechargement%20(3)/zip_telechargement/node_modules/@tailwindcss/vite/dist/index.mjs";
import fs from "node:fs/promises";
import nodePath from "node:path";
import { componentTagger } from "file:///C:/Users/ActiveMedia/Downloads/zip_telechargement%20(3)/zip_telechargement/node_modules/lovable-tagger/dist/index.js";
import path from "path";
import { parse } from "file:///C:/Users/ActiveMedia/Downloads/zip_telechargement%20(3)/zip_telechargement/node_modules/@babel/parser/lib/index.js";
import _traverse from "file:///C:/Users/ActiveMedia/Downloads/zip_telechargement%20(3)/zip_telechargement/node_modules/@babel/traverse/lib/index.js";
import _generate from "file:///C:/Users/ActiveMedia/Downloads/zip_telechargement%20(3)/zip_telechargement/node_modules/@babel/generator/lib/index.js";
import * as t from "file:///C:/Users/ActiveMedia/Downloads/zip_telechargement%20(3)/zip_telechargement/node_modules/@babel/types/lib/index.js";
var __vite_injected_original_dirname = "C:\\Users\\ActiveMedia\\Downloads\\zip_telechargement (3)\\zip_telechargement";
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxBY3RpdmVNZWRpYVxcXFxEb3dubG9hZHNcXFxcemlwX3RlbGVjaGFyZ2VtZW50ICgzKVxcXFx6aXBfdGVsZWNoYXJnZW1lbnRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXEFjdGl2ZU1lZGlhXFxcXERvd25sb2Fkc1xcXFx6aXBfdGVsZWNoYXJnZW1lbnQgKDMpXFxcXHppcF90ZWxlY2hhcmdlbWVudFxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvQWN0aXZlTWVkaWEvRG93bmxvYWRzL3ppcF90ZWxlY2hhcmdlbWVudCUyMCgzKS96aXBfdGVsZWNoYXJnZW1lbnQvdml0ZS5jb25maWcudHNcIjsvLyB2aXRlLmNvbmZpZy50c1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnLCB0eXBlIFBsdWdpbiB9IGZyb20gJ3ZpdGUnO1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0LXN3Yyc7XG5pbXBvcnQgdGFpbHdpbmRjc3MgZnJvbSAnQHRhaWx3aW5kY3NzL3ZpdGUnO1xuaW1wb3J0IGZzIGZyb20gJ25vZGU6ZnMvcHJvbWlzZXMnO1xuaW1wb3J0IG5vZGVQYXRoIGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tICdsb3ZhYmxlLXRhZ2dlcic7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuXG5pbXBvcnQgeyBwYXJzZSB9IGZyb20gJ0BiYWJlbC9wYXJzZXInO1xuaW1wb3J0IF90cmF2ZXJzZSBmcm9tICdAYmFiZWwvdHJhdmVyc2UnO1xuaW1wb3J0IF9nZW5lcmF0ZSBmcm9tICdAYmFiZWwvZ2VuZXJhdG9yJztcbmltcG9ydCAqIGFzIHQgZnJvbSAnQGJhYmVsL3R5cGVzJztcblxuXG4vLyBDSlMvRVNNIGludGVyb3AgZm9yIEJhYmVsIGxpYnNcbmNvbnN0IHRyYXZlcnNlOiB0eXBlb2YgX3RyYXZlcnNlLmRlZmF1bHQgPSAoIChfdHJhdmVyc2UgYXMgYW55KS5kZWZhdWx0ID8/IF90cmF2ZXJzZSApIGFzIGFueTtcbmNvbnN0IGdlbmVyYXRlOiB0eXBlb2YgX2dlbmVyYXRlLmRlZmF1bHQgPSAoIChfZ2VuZXJhdGUgYXMgYW55KS5kZWZhdWx0ID8/IF9nZW5lcmF0ZSApIGFzIGFueTtcblxuZnVuY3Rpb24gY2RuUHJlZml4SW1hZ2VzKCk6IFBsdWdpbiB7XG4gIGNvbnN0IERFQlVHID0gcHJvY2Vzcy5lbnYuQ0ROX0lNR19ERUJVRyA9PT0gJzEnO1xuICBsZXQgcHVibGljRGlyID0gJyc7ICAgICAgICAgICAgICAvLyBhYnNvbHV0ZSBwYXRoIHRvIFZpdGUgcHVibGljIGRpclxuICBjb25zdCBpbWFnZVNldCA9IG5ldyBTZXQ8c3RyaW5nPigpOyAvLyBzdG9yZXMgbm9ybWFsaXplZCAnL2ltYWdlcy8uLi4nIHBhdGhzXG5cbiAgY29uc3QgaXNBYnNvbHV0ZSA9IChwOiBzdHJpbmcpID0+XG4gICAgL14oPzpbYS16XSs6KT9cXC9cXC8vaS50ZXN0KHApIHx8IHAuc3RhcnRzV2l0aCgnZGF0YTonKSB8fCBwLnN0YXJ0c1dpdGgoJ2Jsb2I6Jyk7XG5cbiAgLy8gbm9ybWFsaXplIGEgcmVmIGxpa2UgJy4vaW1hZ2VzL3gucG5nJywgJy4uL2ltYWdlcy94LnBuZycsICcvaW1hZ2VzL3gucG5nJyAtPiAnL2ltYWdlcy94LnBuZydcbiAgY29uc3Qgbm9ybWFsaXplUmVmID0gKHA6IHN0cmluZykgPT4ge1xuICAgIGxldCBzID0gcC50cmltKCk7XG4gICAgLy8gcXVpY2sgYmFpbC1vdXRzXG4gICAgaWYgKGlzQWJzb2x1dGUocykpIHJldHVybiBzO1xuICAgIC8vIHN0cmlwIGxlYWRpbmcgLi8gYW5kIGFueSAuLi8gc2VnbWVudHMgKHdlIHRyZWF0IHB1YmxpYy8gYXMgcm9vdCBhdCBydW50aW1lKVxuICAgIHMgPSBzLnJlcGxhY2UoL14oXFwuXFwvKSsvLCAnJyk7XG4gICAgd2hpbGUgKHMuc3RhcnRzV2l0aCgnLi4vJykpIHMgPSBzLnNsaWNlKDMpO1xuICAgIGlmIChzLnN0YXJ0c1dpdGgoJy8nKSkgcyA9IHMuc2xpY2UoMSk7XG4gICAgLy8gZW5zdXJlIGl0IHN0YXJ0cyB3aXRoIGltYWdlcy9cbiAgICBpZiAoIXMuc3RhcnRzV2l0aCgnaW1hZ2VzLycpKSByZXR1cm4gcDsgLy8gbm90IHVuZGVyIGltYWdlcyBcdTIxOTIgbGVhdmUgYXMgaXNcbiAgICByZXR1cm4gJy8nICsgczsgLy8gY2Fub25pY2FsOiAnL2ltYWdlcy8uLi4nXG4gIH07XG5cbiAgY29uc3QgdG9DRE4gPSAocDogc3RyaW5nLCBjZG46IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IG4gPSBub3JtYWxpemVSZWYocCk7XG4gICAgaWYgKGlzQWJzb2x1dGUobikpIHJldHVybiBuO1xuICAgIGlmICghbi5zdGFydHNXaXRoKCcvaW1hZ2VzLycpKSByZXR1cm4gcDsgICAgICAgICAgIC8vIG5vdCBvdXIgZm9sZGVyXG4gICAgaWYgKCFpbWFnZVNldC5oYXMobikpIHJldHVybiBwOyAgICAgICAgICAgICAgICAgICAgLy8gbm90IGFuIGV4aXN0aW5nIGZpbGVcbiAgICBjb25zdCBiYXNlID0gY2RuLmVuZHNXaXRoKCcvJykgPyBjZG4gOiBjZG4gKyAnLyc7XG4gICAgcmV0dXJuIGJhc2UgKyBuLnNsaWNlKDEpOyAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gJ2h0dHBzOi8vY2RuLy4uLi9pbWFnZXMvLi4nXG4gIH07XG5cbiAgY29uc3QgcmV3cml0ZVNyY3NldExpc3QgPSAodmFsdWU6IHN0cmluZywgY2RuOiBzdHJpbmcpID0+XG4gICAgdmFsdWVcbiAgICAgIC5zcGxpdCgnLCcpXG4gICAgICAubWFwKChwYXJ0KSA9PiB7XG4gICAgICAgIGNvbnN0IFt1cmwsIGRlc2NdID0gcGFydC50cmltKCkuc3BsaXQoL1xccysvLCAyKTtcbiAgICAgICAgY29uc3Qgb3V0ID0gdG9DRE4odXJsLCBjZG4pO1xuICAgICAgICByZXR1cm4gZGVzYyA/IGAke291dH0gJHtkZXNjfWAgOiBvdXQ7XG4gICAgICB9KVxuICAgICAgLmpvaW4oJywgJyk7XG5cbiAgY29uc3QgcmV3cml0ZUh0bWwgPSAoaHRtbDogc3RyaW5nLCBjZG46IHN0cmluZykgPT4ge1xuICAgIC8vIHNyYyAvIGhyZWZcbiAgICBodG1sID0gaHRtbC5yZXBsYWNlKFxuICAgICAgLyhzcmN8aHJlZilcXHMqPVxccyooWydcIl0pKFteJ1wiXSspXFwyL2csXG4gICAgICAoX20sIGssIHEsIHApID0+IGAke2t9PSR7cX0ke3RvQ0ROKHAsIGNkbil9JHtxfWBcbiAgICApO1xuICAgIC8vIHNyY3NldFxuICAgIGh0bWwgPSBodG1sLnJlcGxhY2UoXG4gICAgICAvKHNyY3NldClcXHMqPVxccyooWydcIl0pKFteJ1wiXSspXFwyL2csXG4gICAgICAoX20sIGssIHEsIGxpc3QpID0+IGAke2t9PSR7cX0ke3Jld3JpdGVTcmNzZXRMaXN0KGxpc3QsIGNkbil9JHtxfWBcbiAgICApO1xuICAgIHJldHVybiBodG1sO1xuICB9O1xuXG4gIGNvbnN0IHJld3JpdGVDc3NVcmxzID0gKGNvZGU6IHN0cmluZywgY2RuOiBzdHJpbmcpID0+XG4gICAgY29kZS5yZXBsYWNlKC91cmxcXCgoWydcIl0/KShbXidcIildKylcXDFcXCkvZywgKF9tLCBxLCBwKSA9PiBgdXJsKCR7cX0ke3RvQ0ROKHAsIGNkbil9JHtxfSlgKTtcblxuICBjb25zdCByZXdyaXRlSnN4QXN0ID0gKGNvZGU6IHN0cmluZywgaWQ6IHN0cmluZywgY2RuOiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBhc3QgPSBwYXJzZShjb2RlLCB7IHNvdXJjZVR5cGU6ICdtb2R1bGUnLCBwbHVnaW5zOiBbJ3R5cGVzY3JpcHQnLCAnanN4J10gfSk7XG4gICAgbGV0IHJld3JpdGVzID0gMDtcblxuICAgIHRyYXZlcnNlKGFzdCwge1xuICAgICAgSlNYQXR0cmlidXRlKHBhdGgpIHtcbiAgICAgICAgY29uc3QgbmFtZSA9IChwYXRoLm5vZGUubmFtZSBhcyB0LkpTWElkZW50aWZpZXIpLm5hbWU7XG4gICAgICAgIGNvbnN0IGlzU3JjID0gbmFtZSA9PT0gJ3NyYycgfHwgbmFtZSA9PT0gJ2hyZWYnO1xuICAgICAgICBjb25zdCBpc1NyY1NldCA9IG5hbWUgPT09ICdzcmNTZXQnIHx8IG5hbWUgPT09ICdzcmNzZXQnO1xuICAgICAgICBpZiAoIWlzU3JjICYmICFpc1NyY1NldCkgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IHZhbCA9IHBhdGgubm9kZS52YWx1ZTtcbiAgICAgICAgaWYgKCF2YWwpIHJldHVybjtcblxuICAgICAgICBpZiAodC5pc1N0cmluZ0xpdGVyYWwodmFsKSkge1xuICAgICAgICAgIGNvbnN0IGJlZm9yZSA9IHZhbC52YWx1ZTtcbiAgICAgICAgICB2YWwudmFsdWUgPSBpc1NyYyA/IHRvQ0ROKHZhbC52YWx1ZSwgY2RuKSA6IHJld3JpdGVTcmNzZXRMaXN0KHZhbC52YWx1ZSwgY2RuKTtcbiAgICAgICAgICBpZiAodmFsLnZhbHVlICE9PSBiZWZvcmUpIHJld3JpdGVzKys7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0LmlzSlNYRXhwcmVzc2lvbkNvbnRhaW5lcih2YWwpICYmIHQuaXNTdHJpbmdMaXRlcmFsKHZhbC5leHByZXNzaW9uKSkge1xuICAgICAgICAgIGNvbnN0IGJlZm9yZSA9IHZhbC5leHByZXNzaW9uLnZhbHVlO1xuICAgICAgICAgIHZhbC5leHByZXNzaW9uLnZhbHVlID0gaXNTcmNcbiAgICAgICAgICAgID8gdG9DRE4odmFsLmV4cHJlc3Npb24udmFsdWUsIGNkbilcbiAgICAgICAgICAgIDogcmV3cml0ZVNyY3NldExpc3QodmFsLmV4cHJlc3Npb24udmFsdWUsIGNkbik7XG4gICAgICAgICAgaWYgKHZhbC5leHByZXNzaW9uLnZhbHVlICE9PSBiZWZvcmUpIHJld3JpdGVzKys7XG4gICAgICAgIH1cbiAgICAgIH0sXG5cbiAgICAgIFN0cmluZ0xpdGVyYWwocGF0aCkge1xuICAgICAgICAvLyBza2lwIG9iamVjdCBrZXlzOiB7IFwiaW1hZ2VcIjogXCIuLi5cIiB9XG4gICAgICAgIGlmICh0LmlzT2JqZWN0UHJvcGVydHkocGF0aC5wYXJlbnQpICYmIHBhdGgucGFyZW50S2V5ID09PSAna2V5JyAmJiAhcGF0aC5wYXJlbnQuY29tcHV0ZWQpIHJldHVybjtcbiAgICAgICAgLy8gc2tpcCBpbXBvcnQvZXhwb3J0IHNvdXJjZXNcbiAgICAgICAgaWYgKHQuaXNJbXBvcnREZWNsYXJhdGlvbihwYXRoLnBhcmVudCkgfHwgdC5pc0V4cG9ydEFsbERlY2xhcmF0aW9uKHBhdGgucGFyZW50KSB8fCB0LmlzRXhwb3J0TmFtZWREZWNsYXJhdGlvbihwYXRoLnBhcmVudCkpIHJldHVybjtcbiAgICAgICAgLy8gc2tpcCBpbnNpZGUgSlNYIGF0dHJpYnV0ZSAoYWxyZWFkeSBoYW5kbGVkKVxuICAgICAgICBpZiAocGF0aC5maW5kUGFyZW50KHAgPT4gcC5pc0pTWEF0dHJpYnV0ZSgpKSkgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IGJlZm9yZSA9IHBhdGgubm9kZS52YWx1ZTtcbiAgICAgICAgY29uc3QgYWZ0ZXIgPSB0b0NETihiZWZvcmUsIGNkbik7XG4gICAgICAgIGlmIChhZnRlciAhPT0gYmVmb3JlKSB7IHBhdGgubm9kZS52YWx1ZSA9IGFmdGVyOyByZXdyaXRlcysrOyB9XG4gICAgICB9LFxuXG4gICAgICBUZW1wbGF0ZUxpdGVyYWwocGF0aCkge1xuICAgICAgICAvLyBoYW5kbGUgYFwiL2ltYWdlcy9mb28ucG5nXCJgIGFzIHRlbXBsYXRlIHdpdGggTk8gZXhwcmVzc2lvbnNcbiAgICAgICAgaWYgKHBhdGgubm9kZS5leHByZXNzaW9ucy5sZW5ndGgpIHJldHVybjtcbiAgICAgICAgY29uc3QgcmF3ID0gcGF0aC5ub2RlLnF1YXNpcy5tYXAocSA9PiBxLnZhbHVlLmNvb2tlZCA/PyBxLnZhbHVlLnJhdykuam9pbignJyk7XG4gICAgICAgIGNvbnN0IGFmdGVyID0gdG9DRE4ocmF3LCBjZG4pO1xuICAgICAgICBpZiAoYWZ0ZXIgIT09IHJhdykge1xuICAgICAgICAgIHBhdGgucmVwbGFjZVdpdGgodC5zdHJpbmdMaXRlcmFsKGFmdGVyKSk7XG4gICAgICAgICAgcmV3cml0ZXMrKztcbiAgICAgICAgfVxuICAgICAgfSxcblxuICAgIH0pO1xuXG4gICAgaWYgKCFyZXdyaXRlcykgcmV0dXJuIG51bGw7XG4gICAgY29uc3Qgb3V0ID0gZ2VuZXJhdGUoYXN0LCB7IHJldGFpbkxpbmVzOiB0cnVlLCBzb3VyY2VNYXBzOiBmYWxzZSB9LCBjb2RlKS5jb2RlO1xuICAgIGlmIChERUJVRykgY29uc29sZS5sb2coYFtjZG5dICR7aWR9IFx1MjE5MiAke3Jld3JpdGVzfSByZXdyaXRlc2ApO1xuICAgIHJldHVybiBvdXQ7XG4gIH07XG5cbiAgYXN5bmMgZnVuY3Rpb24gY29sbGVjdFB1YmxpY0ltYWdlc0Zyb20oZGlyOiBzdHJpbmcpIHtcbiAgICAvLyBSZWN1cnNpdmVseSBjb2xsZWN0IGV2ZXJ5IGZpbGUgdW5kZXIgcHVibGljL2ltYWdlcyBpbnRvIGltYWdlU2V0IGFzICcvaW1hZ2VzL3JlbHBhdGgnXG4gICAgY29uc3QgaW1hZ2VzRGlyID0gbm9kZVBhdGguam9pbihkaXIsICdpbWFnZXMnKTtcbiAgICBjb25zdCBzdGFjayA9IFtpbWFnZXNEaXJdO1xuICAgIHdoaWxlIChzdGFjay5sZW5ndGgpIHtcbiAgICAgIGNvbnN0IGN1ciA9IHN0YWNrLnBvcCgpITtcbiAgICAgIGxldCBlbnRyaWVzOiBhbnlbXSA9IFtdO1xuICAgICAgdHJ5IHtcbiAgICAgICAgZW50cmllcyA9IGF3YWl0IGZzLnJlYWRkaXIoY3VyLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgY29udGludWU7IC8vIGltYWdlcy8gbWF5IG5vdCBleGlzdFxuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBlbnQgb2YgZW50cmllcykge1xuICAgICAgICBjb25zdCBmdWxsID0gbm9kZVBhdGguam9pbihjdXIsIGVudC5uYW1lKTtcbiAgICAgICAgaWYgKGVudC5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgc3RhY2sucHVzaChmdWxsKTtcbiAgICAgICAgfSBlbHNlIGlmIChlbnQuaXNGaWxlKCkpIHtcbiAgICAgICAgICBjb25zdCByZWwgPSBub2RlUGF0aC5yZWxhdGl2ZShkaXIsIGZ1bGwpLnNwbGl0KG5vZGVQYXRoLnNlcCkuam9pbignLycpO1xuICAgICAgICAgIGNvbnN0IGNhbm9uaWNhbCA9ICcvJyArIHJlbDsgLy8gJy9pbWFnZXMvLi4uJ1xuICAgICAgICAgIGltYWdlU2V0LmFkZChjYW5vbmljYWwpO1xuICAgICAgICAgIC8vIGFsc28gYWRkIHZhcmlhbnQgd2l0aG91dCBsZWFkaW5nIHNsYXNoIGZvciBzYWZldHlcbiAgICAgICAgICBpbWFnZVNldC5hZGQoY2Fub25pY2FsLnNsaWNlKDEpKTsgLy8gJ2ltYWdlcy8uLi4nXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIG5hbWU6ICdjZG4tcHJlZml4LWltYWdlcy1leGlzdGluZycsXG4gICAgYXBwbHk6ICdidWlsZCcsXG4gICAgZW5mb3JjZTogJ3ByZScsIC8vIHJ1biBiZWZvcmUgQHZpdGVqcy9wbHVnaW4tcmVhY3RcblxuICAgIGNvbmZpZ1Jlc29sdmVkKGNmZykge1xuICAgICAgcHVibGljRGlyID0gY2ZnLnB1YmxpY0RpcjsgLy8gYWJzb2x1dGVcbiAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coJ1tjZG5dIHB1YmxpY0RpciA9JywgcHVibGljRGlyKTtcbiAgICB9LFxuXG4gICAgYXN5bmMgYnVpbGRTdGFydCgpIHtcbiAgICAgIGF3YWl0IGNvbGxlY3RQdWJsaWNJbWFnZXNGcm9tKHB1YmxpY0Rpcik7XG4gICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKCdbY2RuXSBpbWFnZXMgZm91bmQ6JywgaW1hZ2VTZXQuc2l6ZSk7XG4gICAgfSxcblxuICAgIHRyYW5zZm9ybUluZGV4SHRtbChodG1sKSB7XG4gICAgICBjb25zdCBjZG4gPSBwcm9jZXNzLmVudi5DRE5fSU1HX1BSRUZJWDtcbiAgICAgIGlmICghY2RuKSByZXR1cm4gaHRtbDtcbiAgICAgIGNvbnN0IG91dCA9IHJld3JpdGVIdG1sKGh0bWwsIGNkbik7XG4gICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKCdbY2RuXSB0cmFuc2Zvcm1JbmRleEh0bWwgZG9uZScpO1xuICAgICAgcmV0dXJuIG91dDtcbiAgICB9LFxuXG4gICAgdHJhbnNmb3JtKGNvZGUsIGlkKSB7XG4gICAgICBjb25zdCBjZG4gPSBwcm9jZXNzLmVudi5DRE5fSU1HX1BSRUZJWDtcbiAgICAgIGlmICghY2RuKSByZXR1cm4gbnVsbDtcblxuICAgICAgaWYgKC9cXC4oanN4fHRzeCkkLy50ZXN0KGlkKSkge1xuICAgICAgICBjb25zdCBvdXQgPSByZXdyaXRlSnN4QXN0KGNvZGUsIGlkLCBjZG4pO1xuICAgICAgICByZXR1cm4gb3V0ID8geyBjb2RlOiBvdXQsIG1hcDogbnVsbCB9IDogbnVsbDtcbiAgICAgIH1cblxuICAgICAgaWYgKC9cXC4oY3NzfHNjc3N8c2Fzc3xsZXNzfHN0eWwpJC9pLnRlc3QoaWQpKSB7XG4gICAgICAgIGNvbnN0IG91dCA9IHJld3JpdGVDc3NVcmxzKGNvZGUsIGNkbik7XG4gICAgICAgIHJldHVybiBvdXQgPT09IGNvZGUgPyBudWxsIDogeyBjb2RlOiBvdXQsIG1hcDogbnVsbCB9O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9LFxuICB9O1xufVxuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xuICByZXR1cm4ge1xuICAgIHNlcnZlcjoge1xuICAgICAgaG9zdDogXCI6OlwiLFxuICAgICAgcG9ydDogODA4MCxcbiAgICAgIHByb3h5OiB7XG4gICAgICAgICcvYXBpJzoge1xuICAgICAgICAgIHRhcmdldDogJ2h0dHA6Ly8xMjcuMC4wLjE6ODAwMCcsXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBwbHVnaW5zOiBbXG4gICAgICB0YWlsd2luZGNzcygpLFxuICAgICAgcmVhY3QoKSxcbiAgICAgIG1vZGUgPT09ICdkZXZlbG9wbWVudCcgJiZcbiAgICAgIGNvbXBvbmVudFRhZ2dlcigpLFxuICAgICAgY2RuUHJlZml4SW1hZ2VzKCksXG4gICAgXS5maWx0ZXIoQm9vbGVhbiksXG4gICAgcmVzb2x2ZToge1xuICAgICAgYWxpYXM6IHtcbiAgICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgICAgIC8vIFByb3h5IHJlYWN0LXJvdXRlci1kb20gdG8gb3VyIHdyYXBwZXJcbiAgICAgICAgXCJyZWFjdC1yb3V0ZXItZG9tXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmMvbGliL3JlYWN0LXJvdXRlci1kb20tcHJveHkudHN4XCIpLFxuICAgICAgICAvLyBPcmlnaW5hbCByZWFjdC1yb3V0ZXItZG9tIHVuZGVyIGEgZGlmZmVyZW50IG5hbWVcbiAgICAgICAgXCJyZWFjdC1yb3V0ZXItZG9tLW9yaWdpbmFsXCI6IFwicmVhY3Qtcm91dGVyLWRvbVwiLFxuICAgICAgfSxcbiAgICB9LFxuICAgIGRlZmluZToge1xuICAgICAgLy8gRGVmaW5lIGVudmlyb25tZW50IHZhcmlhYmxlcyBmb3IgYnVpbGQtdGltZSBjb25maWd1cmF0aW9uXG4gICAgICAvLyBJbiBwcm9kdWN0aW9uLCB0aGlzIHdpbGwgYmUgZmFsc2UgYnkgZGVmYXVsdCB1bmxlc3MgZXhwbGljaXRseSBzZXQgdG8gJ3RydWUnXG4gICAgICAvLyBJbiBkZXZlbG9wbWVudCBhbmQgdGVzdCwgdGhpcyB3aWxsIGJlIHRydWUgYnkgZGVmYXVsdFxuICAgICAgX19ST1VURV9NRVNTQUdJTkdfRU5BQkxFRF9fOiBKU09OLnN0cmluZ2lmeShcbiAgICAgICAgbW9kZSA9PT0gJ3Byb2R1Y3Rpb24nIFxuICAgICAgICAgID8gcHJvY2Vzcy5lbnYuVklURV9FTkFCTEVfUk9VVEVfTUVTU0FHSU5HID09PSAndHJ1ZSdcbiAgICAgICAgICA6IHByb2Nlc3MuZW52LlZJVEVfRU5BQkxFX1JPVVRFX01FU1NBR0lORyAhPT0gJ2ZhbHNlJ1xuICAgICAgKSxcbiAgICB9LFxuICB9XG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFDQSxTQUFTLG9CQUFpQztBQUMxQyxPQUFPLFdBQVc7QUFDbEIsT0FBTyxpQkFBaUI7QUFDeEIsT0FBTyxRQUFRO0FBQ2YsT0FBTyxjQUFjO0FBQ3JCLFNBQVMsdUJBQXVCO0FBQ2hDLE9BQU8sVUFBVTtBQUVqQixTQUFTLGFBQWE7QUFDdEIsT0FBTyxlQUFlO0FBQ3RCLE9BQU8sZUFBZTtBQUN0QixZQUFZLE9BQU87QUFabkIsSUFBTSxtQ0FBbUM7QUFnQnpDLElBQU0sV0FBd0MsVUFBa0IsV0FBVztBQUMzRSxJQUFNLFdBQXdDLFVBQWtCLFdBQVc7QUFFM0UsU0FBUyxrQkFBMEI7QUFDakMsUUFBTSxRQUFRLFFBQVEsSUFBSSxrQkFBa0I7QUFDNUMsTUFBSSxZQUFZO0FBQ2hCLFFBQU0sV0FBVyxvQkFBSSxJQUFZO0FBRWpDLFFBQU0sYUFBYSxDQUFDLE1BQ2xCLHFCQUFxQixLQUFLLENBQUMsS0FBSyxFQUFFLFdBQVcsT0FBTyxLQUFLLEVBQUUsV0FBVyxPQUFPO0FBRy9FLFFBQU0sZUFBZSxDQUFDLE1BQWM7QUFDbEMsUUFBSSxJQUFJLEVBQUUsS0FBSztBQUVmLFFBQUksV0FBVyxDQUFDLEVBQUcs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
