import type { NextConfig } from "next";

const ONNX_RUNTIME_FILES = [
  'node_modules/onnxruntime-node/package.json',
  'node_modules/onnxruntime-node/dist/**',
  'node_modules/onnxruntime-node/bin/napi-v6/linux/x64/libonnxruntime.so.1',
  'node_modules/onnxruntime-node/bin/napi-v6/linux/x64/libonnxruntime_providers_shared.so',
  'node_modules/onnxruntime-node/bin/napi-v6/linux/x64/onnxruntime_binding.node',
  'node_modules/onnxruntime-common/**',
  // the model itself, fetched by scripts/fetch-model.mjs during `npm run build` (~91 MB)
  '.model-cache/**',
];

const nextConfig: NextConfig = {
  /* config options here */
  // transformers.js runs the embedding model in-process through onnxruntime-node's native binary
  serverExternalPackages: ['pdf-parse', '@huggingface/transformers', 'onnxruntime-node'],
  // transformers.js requires onnxruntime-node in a way the tracer can't follow, so the routes that
  // embed list it explicitly: its JS plus only the linux-x64 CPU runtime (~46 MB), not the other
  // platforms or the 272 MB CUDA provider, and the bundled model (Hobby caps a function at 250 MB).
  outputFileTracingIncludes: Object.fromEntries(
    // full route ids: Next matches these keys as substrings, so '/api/experiences' alone would
    // also catch /api/experiences/[id]/helpful
    ['/api/chat/route', '/api/experiences/route', '/api/admin/experiences/route'].map((route) => [route, ONNX_RUNTIME_FILES])
  ),
  // Pages that merely import lib/vector get the model traced in too; only the three routes above
  // keep it (excludes don't filter includes). A stray transformers.js download cache never ships.
  outputFileTracingExcludes: { '*': ['.model-cache/**', 'node_modules/@huggingface/transformers/.cache/**'] },
  reactStrictMode: true,
  async headers() {
    return [
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
