import { existsSync } from 'node:fs';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';





const EDGE_CANDIDATES = process.platform === 'win32'
  ? [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ]
  : process.platform === 'darwin'
    ? ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']
    : ['/usr/bin/microsoft-edge', '/usr/bin/microsoft-edge-stable', '/usr/bin/chromium'];

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

async function waitForDebugPage(port, expectedUrl) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const pages = await response.json();
      const page = pages.find((candidate) => candidate.type === 'page' && candidate.url === expectedUrl);
      if (page) return page;
    } catch {
      // Edge has not opened its debugging endpoint yet.
    }
    await delay(100);
  }
  throw new Error('Edge debugging endpoint did not become ready');
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.runtimeErrors = [];

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const request = this.pending.get(message.id);
        if (!request) return;
        this.pending.delete(message.id);
        if (message.error) request.reject(new Error(message.error.message));
        else request.resolve(message.result);
        return;
      }

      if (message.method === 'Runtime.exceptionThrown') {
        const details = message.params.exceptionDetails;
        this.runtimeErrors.push(details.exception?.description || details.text);
      }
      if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
        this.runtimeErrors.push(
          message.params.args.map((argument) => argument.value || argument.description).join(' ')
        );
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolveRequest, rejectRequest) => {
      this.pending.set(id, { resolve: resolveRequest, reject: rejectRequest });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {

    const response = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    }
    return response.result.value;
  }
}

async function connect(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  await new Promise((resolveSocket, rejectSocket) => {
    socket.addEventListener('open', resolveSocket, { once: true });
    socket.addEventListener('error', rejectSocket, { once: true });
  });
  return { socket, client: new CdpClient(socket) };
}

// Re-encode existing gameplay with a 0.3 second cover, keeping normal speed.
// The tail is trimmed by 0.3 seconds to preserve a 15 second total duration.
async function run() {
  const output = new URL('../clipsjuego/finales/', import.meta.url);
  await mkdir(output, { recursive: true });
  const browserPath = EDGE_CANDIDATES.find(existsSync);
  if (!browserPath) throw new Error('Edge/Chromium was not found');
  const profile = await mkdtemp(join(tmpdir(), 'geometry-video-edit-'));
  const port = 9500 + Math.floor(Math.random() * 300);
  const browser = spawn(browserPath, [
    '--headless=new', '--no-first-run', '--no-default-browser-check',
    '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding', '--remote-allow-origins=*',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore' });
  let socket;
  const report = [];
  try {
    const connection = await connect((await waitForDebugPage(port, 'about:blank')).webSocketDebuggerUrl);
    socket = connection.socket;
    const { client } = connection;
    await client.send('Runtime.enable');
    const formats = [
      ['01-horizontal', 'horizontal-1920x1080.png', 1920, 1080],
      ['02-vertical', 'vertical-800x1200.png', 1080, 1620],
      ['03-cuadrado-extra', 'cuadrada-800x800.png', 1080, 1080],
    ];
    for (const [name, cover, width, height] of formats) {
      const videoBase64 = (await readFile(new URL(`../clipsjuego/${name}.mp4`, import.meta.url))).toString('base64');
      const coverBase64 = (await readFile(new URL(`../crazygames/portadas/${cover}`, import.meta.url))).toString('base64');
      await client.evaluate(`(async () => {
        const bytes = Uint8Array.from(atob(${JSON.stringify(videoBase64)}), c => c.charCodeAt(0));
        const video = document.createElement('video');
        video.muted = true; video.playsInline = true; video.preload = 'auto';
        video.src = URL.createObjectURL(new Blob([bytes], {type:'video/mp4'}));
        await new Promise((resolve, reject) => {video.onloadeddata = resolve; video.onerror = reject;});
        if (video.videoWidth !== ${width} || video.videoHeight !== ${height}) throw Error('Source dimensions differ');
        const cover = new Image(); cover.src = 'data:image/png;base64,${coverBase64}'; await cover.decode();
        const canvas = document.createElement('canvas'); canvas.width = ${width}; canvas.height = ${height};
        const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
        ctx.drawImage(cover, 0, 0, canvas.width, canvas.height);
        window.expectedCover = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const stream = canvas.captureStream(30);
        const mimeType = 'video/mp4;codecs=avc1.42001f';
        if (!MediaRecorder.isTypeSupported(mimeType)) throw Error('MP4 encoder unavailable');
        const recorder = new MediaRecorder(stream, {mimeType, videoBitsPerSecond:12000000});
        const chunks = []; let animation; let playing = false;
        recorder.ondataavailable = e => {if(e.data.size) chunks.push(e.data);};
        window.finished = new Promise((resolve, reject) => {
          recorder.onerror = e => reject(Error(e.error?.message || 'Encoding failed'));
          recorder.onstop = () => {
            cancelAnimationFrame(animation); video.pause(); stream.getTracks().forEach(t=>t.stop());
            window.resultBlob = new Blob(chunks, {type:'video/mp4'});
            const reader = new FileReader();
            reader.onload = () => {window.resultBase64 = reader.result.split(',')[1]; resolve({sourceEnd:video.currentTime, bytes:window.resultBlob.size});};
            reader.readAsDataURL(window.resultBlob); URL.revokeObjectURL(video.src);
          };
        });
        function draw() {
          ctx.drawImage(playing ? video : cover, 0, 0, canvas.width, canvas.height);
          animation = requestAnimationFrame(draw);
        }
        recorder.start(); draw();
        setTimeout(async () => {await video.play(); playing = true;}, 300);
        setTimeout(() => recorder.stop(), 15000);
      })()`);
      console.log(`Adding cover: ${name}`);
      const stats = await client.evaluate('window.finished');
      await writeFile(new URL(`${name}.mp4`, output), Buffer.from(await client.evaluate('window.resultBase64'), 'base64'));
      const metadata = await client.evaluate(`(async () => {
        const v = document.createElement('video'); v.muted = true; v.src = URL.createObjectURL(window.resultBlob);
        await new Promise((resolve,reject)=>{v.onloadeddata=resolve;v.onerror=reject;});
        window.reviewVideo = v;
        return {width:v.videoWidth,height:v.videoHeight,duration:v.duration};
      })()`);
      const checks = [];
      for (const second of [0.05, 0.5, 7, 14.8]) {
        const frame = await client.evaluate(`(async () => {
          const v=window.reviewVideo;
          await new Promise(resolve=>{v.onseeked=resolve;v.currentTime=${second};});
          const c=document.createElement('canvas'); c.width=v.videoWidth;c.height=v.videoHeight;
          const ctx=c.getContext('2d');ctx.drawImage(v,0,0);
          const data=ctx.getImageData(0,0,c.width,c.height).data;
          let error=0, count=0;
          for(let i=0;i<data.length;i+=40){for(let channel=0;channel<3;channel++){error+=Math.abs(data[i+channel]-window.expectedCover[i+channel]);count++;}}
          return {png:c.toDataURL('image/png').split(',')[1],coverDifference:error/count};
        })()`);
        await writeFile(join(tmpdir(), `final-${name}-${second}.png`), Buffer.from(frame.png, 'base64'));
        checks.push({second, coverDifference:frame.coverDifference});
      }
      if (metadata.width !== width || metadata.height !== height || Math.abs(metadata.duration - 15) > 0.15 || stats.bytes > 50000000
        || stats.sourceEnd < 14.3 || checks[0].coverDifference > 12 || checks[1].coverDifference < 15) {
        throw new Error(`Validation failed: ${JSON.stringify({metadata,stats,checks})}`);
      }
      report.push({filename:`${name}.mp4`,cover,coverSeconds:0.3,...metadata,...stats,checks});
      console.log(JSON.stringify(report.at(-1)));
      await client.evaluate('URL.revokeObjectURL(window.reviewVideo.src); window.reviewVideo.remove();');
    }
    if (client.runtimeErrors.length) throw new Error(client.runtimeErrors.join('\n'));
    await writeFile(new URL('verificacion.json', output), JSON.stringify(report, null, 2));
  } finally {
    socket?.close(); browser.kill();
    if (profile.startsWith(join(tmpdir(), 'geometry-video-edit-'))) {
      await rm(profile, {recursive:true, force:true}).catch(()=>{});
    }
  }
}

run().catch(error=>{console.error(error);process.exitCode=1;});

