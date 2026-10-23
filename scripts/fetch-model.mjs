// Downloads the embedding model into .model-cache/ before `next build`, so deployments carry the
// weights and a cold start never downloads 90 MB. Run: node scripts/fetch-model.mjs (npm run build does).
//
// If the download fails the build still goes ahead with a loud warning: lib/vector.ts then falls back
// to downloading at runtime, which is slower but still works. Submissions and approvals embed after
// their response either way, so neither depends on this.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const MODEL = 'Xenova/all-MiniLM-L6-v2';
const REVISION = '751bff37182d3f1213fa05d7196b954e230abad9'; // pinned, so every build ships the same weights
// Every file is checked, not just the weights: what ships is exactly what was reviewed at REVISION
const FILES = {
    'config.json': '7135149f7cffa1a573466c6e4d8423ed73b62fd2332c575bf738a0d033f70df7',
    'tokenizer.json': 'da0e79933b9ed51798a3ae27893d3c5fa4a201126cef75586296df9b4d2c62a0',
    'tokenizer_config.json': '9261e7d79b44c8195c1cada2b453e55b00aeb81e907a6664974b4d7776172ab3',
    'onnx/model.onnx': '759c3cd2b7fe7e93933ad23c4c9181b7396442a2ed746ec7c1d46192c469c46e',
};
const root = join(import.meta.dirname, '..', '.model-cache', MODEL);

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

try {
    for (const [file, hash] of Object.entries(FILES)) {
        const target = join(root, file);
        if (existsSync(target) && sha256(readFileSync(target)) === hash) continue;
        const started = Date.now();
        const res = await fetch(`https://huggingface.co/${MODEL}/resolve/${REVISION}/${file}`);
        if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        if (sha256(buf) !== hash) throw new Error(`${file}: checksum mismatch`);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, buf);
        console.log(`fetch-model: ${file} ${(buf.length / 1e6).toFixed(1)} MB in ${Date.now() - started} ms`);
    }
    console.log(`fetch-model: ${MODEL} ready in .model-cache (bundled with the embedding routes)`);
} catch (error) {
    console.warn(`\n⚠️  fetch-model: COULD NOT BUNDLE ${MODEL} (${error.message}).`);
    console.warn('⚠️  The build continues; the app will download the model at runtime on each cold start instead.\n');
}
