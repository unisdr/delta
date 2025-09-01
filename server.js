import { createRequestHandler } from "@remix-run/express";
import express from "express";

const viteDevServer =
  process.env.NODE_ENV === "production"
    ? null
    : await import("vite").then((vite) =>
        vite.createServer({
          server: { middlewareMode: true },
        })
      );

const app = express();

// Add security headers middleware
app.use((req, res, next) => {
  
  res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
  res.setHeader("Permissions-Policy", "geolocation=(self), microphone=(), camera=(), fullscreen=(self), payment=()");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-Powered-By", "");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  // res.setHeader("Pragma", "no-cache");
  // res.setHeader("Expires", "0");
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' blob: https://unpkg.com https://cdnjs.cloudflare.com https://*.preventionweb.net https://ajax.cloudflare.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://unpkg.com https://cdnjs.cloudflare.com; img-src 'self' data: blob: https://*.preventionweb.net https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org https://maps.google.com https://rawgit.com; font-src 'self' https:; connect-src 'self' https: wss: https://data.undrr.org https://nominatim.openstreetmap.org https://unb2c.b2clogin.com https://*.b2clogin.com; worker-src 'self' blob:; frame-src 'self' https://unb2c.b2clogin.com https://*.b2clogin.com; form-action 'self' https://*.b2clogin.com; object-src 'self' data: blob:; base-uri 'self'; frame-ancestors 'self';");

  next();
});


app.use(
  viteDevServer
    ? viteDevServer.middlewares
    : express.static("build/client")
);

const build = viteDevServer
  ? () =>
      viteDevServer.ssrLoadModule(
        "virtual:remix/server-build"
      )
  : await import("./build/server/index.js");

app.all("*", createRequestHandler({ build }));

app.listen(3000, () => {
  console.log("App listening on http://localhost:3000");
});

