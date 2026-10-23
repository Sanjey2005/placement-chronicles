import type { NextConfig } from "next";
import { existsSync } from "node:fs";

const ONNX_RUNTIME_FILES = [
  'node_modules/onnxruntime-node/package.json',
  'node_modules/onnxruntime-node/dist/**',
  'node_modules/onnxruntime-node/bin/napi-v6/linux/x64/libonnxruntime.so.1',
  'node_modules/onnxruntime-node/bin/napi-v6/linux/x64/onnxruntime_binding.node',
  'node_modules/onnxruntime-common/**',
  // the model itself, fetched by scripts/fetch-model.mjs during `npm run build` (~91 MB)
  '.model-cache/**',
];

// Everything is same-origin except company logos (Google's favicon service, which redirects to
// gstatic). ponytail: scripts keep 'unsafe-inline' because Next's inline bootstrap scripts need it
// without per-request nonces; a nonce-based CSP in middleware is the stronger upgrade.
// Dev adds 'unsafe-eval' (React Refresh) and Vercel Analytics' debug script.
const dev = process.env.NODE_ENV !== 'production';
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval' https://va.vercel-scripts.com" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://www.google.com https://*.gstatic.com",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const nextConfig: NextConfig = {
  // Baked in at build: did scripts/fetch-model.mjs leave the weights here before `next build`?
  // /api/health reports it, telling "the fetch never ran" apart from "it ran but didn't ship".
  env: {
    MODEL_FETCHED_AT_BUILD: existsSync('.model-cache/Xenova/all-MiniLM-L6-v2/onnx/model.onnx') ? 'yes' : 'no',
  },
  /* config options here */
  // transformers.js runs the embedding model in-process through onnxruntime-node's native binary
  serverExternalPackages: ['pdf-parse', '@huggingface/transformers', 'onnxruntime-node'],
  // transformers.js requires onnxruntime-node in a way the tracer can't follow, so the routes that
  // embed list it explicitly: its JS plus only the linux-x64 CPU runtime (~46 MB), not the other
  // platforms or the 272 MB CUDA provider, and the bundled model (Hobby caps a function at 250 MB).
  outputFileTracingIncludes: Object.fromEntries(
    // full route ids: Next matches these keys as substrings, so '/api/experiences' alone would
    // also catch /api/experiences/[id]/helpful
    ['/api/chat/route', '/api/experiences/route', '/api/admin/experiences/route', '/api/health/route'].map((route) => [route, ONNX_RUNTIME_FILES])
  ),
  // Pages that merely import lib/vector get the model traced in too; only the three routes above
  // keep it (excludes don't filter includes). A stray transformers.js download cache never ships.
  outputFileTracingExcludes: { '*': ['.model-cache/**', 'node_modules/@huggingface/transformers/.cache/**'] },
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
      {
        // Apply strict CORS to all API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "https://placement-chronicles.vercel.app" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ]
      }
    ]
  }
};

export default nextConfig;
