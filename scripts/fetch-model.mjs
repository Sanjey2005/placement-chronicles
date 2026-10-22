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
const WEIGHTS_SHA256 = '759c3cd2b7fe7e93933ad23c4c9181b7396442a2ed746ec7c1d46192c469c46e';
const FILES = ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'onnx/model.onnx'];
const root = join(import.meta.dirname, '..', '.model-cache', MODEL);

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

try {
    for (const file of FILES) {
        const target = join(root, file);
        const weights = file === 'onnx/model.onnx';
        if (existsSync(target) && (!weights || sha256(readFileSync(target)) === WEIGHTS_SHA256)) continue;
        const started = Date.now();
        const res = await fetch(`https://huggingface.co/${MODEL}/resolve/${REVISION}/${file}`);
        if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        if (weights && sha256(buf) !== WEIGHTS_SHA256) throw new Error(`${file}: checksum mismatch`);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, buf);
        console.log(`fetch-model: ${file} ${(buf.length / 1e6).toFixed(1)} MB in ${Date.now() - started} ms`);
    }
    console.log(`fetch-model: ${MODEL} ready in .model-cache (bundled with the embedding routes)`);
} catch (error) {
    console.warn(`\n⚠️  fetch-model: COULD NOT BUNDLE ${MODEL} (${error.message}).`);
    console.warn('⚠️  The build continues; the app will download the model at runtime on each cold start instead.\n');
}
