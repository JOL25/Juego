import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const crazygames = process.argv.includes('--crazygames');
const [html, css, bundle] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../style.css', import.meta.url), 'utf8'),
  build({
    absWorkingDir: root,
    stdin: {
      contents: "export * from './js/main.js'; export * as ultimates from './js/weapons/Ultimates.js';",
      resolveDir: root,
      sourcefile: 'standalone-entry.js',
    },
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'CircleVsGeometry',
    platform: 'browser',
    target: 'es2020',
    charset: 'utf8',
  }),
]);

const standalone = html
  .replace('<link rel="stylesheet" href="style.css" />', () => `<style>\n${css}\n</style>`)
  .replace(/^<link[^>]*https:\/\/fonts\.googleapis\.com[^>]*>\r?\n/gm, '')
  .replace('<script type="module" src="js/main.js"></script>', () =>
    `<script>\n${bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')}\n</script>`);

if (crazygames) {
  await mkdir(new URL('../crazygames/juego/', import.meta.url), { recursive: true });
  const portalHtml = standalone.replace('<head>', '<head>\n<meta name="game-portal" content="crazygames" />');
  await writeFile(new URL('../crazygames/juego/index.html', import.meta.url), portalHtml, 'utf8');
  await writeFile(new URL('../crazygames/index.html', import.meta.url), portalHtml, 'utf8');
  console.log('Generated CrazyGames build with SDK v3 integration.');
} else {
  await writeFile(new URL('../jugar.html', import.meta.url), standalone, 'utf8');
  console.log('Generated jugar.html. Open it directly in your browser to play.');
}
