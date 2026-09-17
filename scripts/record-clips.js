import { existsSync } from 'node:fs';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

import { createStaticServer } from './dev-server.js';

const standalone = false;

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
    if (standalone) {
      expression = expression
        .replaceAll("await import('./js/main.js')", 'window.CircleVsGeometry')
        .replaceAll("await import('./js/weapons/Ultimates.js')", 'window.CircleVsGeometry.ultimates');
    }
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


// Capture-only scene setup. Production game files and player preferences are untouched.
async function run() {
  const output = new URL('../clipsjuego/', import.meta.url);
  await mkdir(output, { recursive: true });
  const server = await createStaticServer({ port: 0 });
  const gameUrl = `http://127.0.0.1:${server.address().port}/`;
  const debugPort = 9500 + Math.floor(Math.random()*300);
  const browserDataDir = await mkdtemp(join(tmpdir(), 'nightfall-record-'));
  const browser = spawn(EDGE_CANDIDATES.find(existsSync), [
    '--headless=new', '--no-first-run', '--no-default-browser-check',
    '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding', '--remote-allow-origins=*',
    `--remote-debugging-port=${debugPort}`, `--user-data-dir=${browserDataDir}`, gameUrl,
  ], { stdio: 'ignore' });
  let socket;
  try {
    const connection = await connect((await waitForDebugPage(debugPort, gameUrl)).webSocketDebuggerUrl);
    socket = connection.socket;
    const { client } = connection;
    await client.send('Runtime.enable');
    for(let i=0;i<150;i++) {
      if(await client.evaluate(`document.getElementById('game-canvas')?.dataset.ready === 'true'`)) break;
      await delay(100);
    }
    const mime = await client.evaluate(`['video/mp4;codecs=avc1.42001f','video/mp4','video/webm;codecs=vp9'].find(type=>MediaRecorder.isTypeSupported(type))`);
    if(!mime) throw new Error('No supported video encoder');
    console.log('Encoder:',mime);
    const formats = [
      { name:'01-horizontal', width:1920, height:1080, ultimate:'ult_orbit_laser' },
      { name:'02-vertical', width:1080, height:1620, ultimate:'ult_wave' },
      { name:'03-cuadrado-extra', width:1080, height:1080, ultimate:'ult_pierce_shot' },
    ];
    const only = process.argv.find(arg => arg.startsWith('--only='))?.slice(7);
    const report = only ? JSON.parse(await readFile(new URL('verificacion.json', output), 'utf8')).filter(c => !c.filename.startsWith(only)) : [];
    for(const format of formats.filter(f => !only || f.name === only)) {
      await client.send('Emulation.setDeviceMetricsOverride', {width:format.width,height:format.height,deviceScaleFactor:1,mobile:false});
      await delay(500);
      await client.evaluate(`(async()=>{
        const {getGameInstance}=await import('./js/main.js');
        const {createWeapon,createUltimate}=await import('./js/weapons/registry.js');
        const {ENEMY_TYPES}=await import('./js/entities/Enemy.js');
        const {setLanguage}=await import('./js/ui/i18n.js');
        setLanguage('en');
        const g=getGameInstance(); window.captureGame=g;
        g.start(); g.sound.setVolume(0); g.resize(${format.width},${format.height});
        // Give narrow recordings enough logical space for the HUD labels.
        if(${format.width} <= ${format.height}) {
          g.canvas.width=720;g.canvas.height=Math.round(720*${format.height}/${format.width});
          g.camera.viewWidth=g.canvas.width;g.camera.viewHeight=g.canvas.height;
        }
        const p=g.player;
        p.level=30; p.survivalTime=735; p.xpToNext=1000000;
        p.maxHp=200; p.hp=200; p.armor=8; p.healOnKill=2;
        p.dashLevel=4; p.dashCharges=4;
        p.weapons=['magic_wand','garlic','pierce_ray','missile'].map(id=>{
          const w=createWeapon(id); w.level=4; return w;
        });
        p.ultimate=createUltimate('${format.ultimate}'); p.ultimate.level=5;
        g.spawner.introducedTypes=new Set(Object.keys(ENEMY_TYPES));
        g.spawner.announcements=[];g.spawner.pendingDebuts=[];
        g.spawner.lastEliteMinute=4;
        g.camera.follow(p.x,p.y);
        const types=Object.values(ENEMY_TYPES);
        for(let i=0;i<85;i++) {
          const a=i*2.399963; const r=155+(i%15)*19;
          g._spawnEnemy(types[i%5],p.x+Math.cos(a)*r,p.y+Math.sin(a)*r,3.4,1.35,false);
        }
        let time=0; let dashAt=3;let ultAt=1;
        const update=g._update.bind(g);
        g.input.getMoveVector=()=>({x:Math.cos(time*.47)*.75,y:Math.sin(time*.47)*.75});
        g._update=dt=>{
          time+=dt;
          if(time>=dashAt){p.tryDash(g.input.getMoveVector());dashAt+=5;}
          if(time>=ultAt && p.ultimate.isReady()){p.ultimate.tryActivate(g);ultAt=time+9;}
          update(dt);
        };
        g._render();
        window.captureClock=()=>time;
        const c=document.createElement('canvas');c.width=${format.width};c.height=${format.height};
        const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
        let copying=true;
        function copy(){ctx.drawImage(g.canvas,0,0,c.width,c.height);if(copying)requestAnimationFrame(copy);}
        copy();
        const stream=c.captureStream(30);
        const recorder=new MediaRecorder(stream,{mimeType:${JSON.stringify(mime)},videoBitsPerSecond:10000000});
        const chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
        window.recordingDone=new Promise((resolve,reject)=>{
          recorder.onerror=e=>reject(new Error(e.error?.message||'Recording failed'));
          recorder.onstop=async()=>{
            copying=false;stream.getTracks().forEach(t=>t.stop());
            window.clipBlob=new Blob(chunks,{type:${JSON.stringify(mime)}});
            const reader=new FileReader();reader.onload=()=>{window.clipBase64=reader.result.split(',')[1];resolve({bytes:window.clipBlob.size,simulationSeconds:time,hp:p.hp,kills:p.kills,state:g.state});};
            reader.readAsDataURL(window.clipBlob);
          };
        });
        recorder.start();setTimeout(()=>recorder.stop(),15000);
      })()`);
      console.log('Recording',format.name);
      const stats = await client.evaluate('window.recordingDone');
      const extension=mime.startsWith('video/mp4')?'mp4':'webm';
      const filename=`${format.name}.${extension}`;
      const encoded = await client.evaluate('window.clipBase64');
      await writeFile(new URL(filename, output),Buffer.from(encoded,'base64'));
      const validation=await client.evaluate(`(async()=>{
        const video=document.createElement('video');video.muted=true;video.src=URL.createObjectURL(window.clipBlob);
        await new Promise((res,rej)=>{video.onloadedmetadata=res;video.onerror=()=>rej(new Error('Video decode failed'));});
        const metadata={width:video.videoWidth,height:video.videoHeight,duration:video.duration};
        window.reviewVideo=video; return metadata;
      })()`);
      for(const second of [2,8,14]) {
        const frame=await client.evaluate(`(async()=>{
          const v=window.reviewVideo;v.currentTime=${second};await new Promise(r=>v.onseeked=r);
          const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;
          c.getContext('2d').drawImage(v,0,0);return c.toDataURL('image/png').split(',')[1];
        })()`);
        await writeFile(join(tmpdir(),`${format.name}-${second}.png`),Buffer.from(frame,'base64'));
      }
      report.push({filename,...stats,...validation});
      console.log(JSON.stringify(report.at(-1)));
      // Reset the update wrapper before the next capture.
      await client.evaluate(`(async()=>{const {Game}=await import('./js/core/Game.js');window.captureGame._update=Game.prototype._update;window.captureGame.togglePause();})()`);
    }
    if(client.runtimeErrors.length) throw new Error(client.runtimeErrors.join('\n'));
    await writeFile(new URL('verificacion.json',output),JSON.stringify(report,null,2));
  } finally {
    socket?.close();browser.kill();
    await new Promise(r=>server.close(r));
    const resolved=join(tmpdir(),'nightfall-record-');
    if(browserDataDir.startsWith(resolved)) await rm(browserDataDir,{recursive:true,force:true}).catch(()=>{});
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
