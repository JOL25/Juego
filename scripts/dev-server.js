import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

export function createStaticServer({ rootDir = process.cwd(), host = '127.0.0.1', port = 8080 } = {}) {
  const root = resolve(rootDir);
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, `http://${host}`).pathname);
      const relativePath = pathname === '/' ? './index.html' : `.${pathname}`;
      const filePath = resolve(root, relativePath);

      if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
        response.writeHead(403).end('Forbidden');
        return;
      }

      const fileStats = await stat(filePath);
      if (!fileStats.isFile()) throw new Error('Not a file');
      const body = await readFile(filePath);
      response.writeHead(200, {
        'Content-Type': MIME_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      response.end(body);
    } catch {
      response.writeHead(404).end('Not found');
    }
  });

  return new Promise((resolveServer, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolveServer(server));
  });
}

async function run() {
  const requestedPort = Number(process.argv[2] || 8080);
  console.log('Nightfall server starting');
  const server = await createStaticServer({ port: requestedPort });
  const address = server.address();
  console.log(`Nightfall server ready at http://127.0.0.1:${address.port}`);
}

const isMainModule = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMainModule) {
  run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
