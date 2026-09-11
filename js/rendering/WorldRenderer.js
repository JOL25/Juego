import { WORLD, PIXEL_ART } from '../config.js';
import { STATE } from '../core/GameState.js';
import { drawHUD, drawJoystick, drawPlayerDashBars, drawUltimateReadyIcon, drawEnemyAnnouncement } from '../ui/HUD.js';

export class WorldRenderer {
  render(game) {
    const { canvas } = game;
    if (!this.worldCanvas) {
      this.worldCanvas = document.createElement('canvas');
      this.worldCanvas.width = canvas.width / PIXEL_ART.scale;
      this.worldCanvas.height = canvas.height / PIXEL_ART.scale;
      this.worldCtx = this.worldCanvas.getContext('2d');
      this.worldView = Object.create(game);
      this.worldView.ctx = this.worldCtx;
    }
    const ctx = this.worldCtx;
    ctx.save();
    ctx.scale(1 / PIXEL_ART.scale, 1 / PIXEL_ART.scale);

    if (game.shakeTimer > 0) {
      const magnitude = 5 * (game.shakeTimer / 140);
      ctx.translate((Math.random() - 0.5) * magnitude, (Math.random() - 0.5) * magnitude);
    }

    ctx.fillStyle = '#120a10';
    ctx.fillRect(-10, -10, canvas.width + 20, canvas.height + 20);
    this.drawGrid(this.worldView);

    if (game.state !== STATE.MENU) this.drawWorld(this.worldView);

    ctx.restore();

    game.ctx.save();
    game.ctx.imageSmoothingEnabled = false;
    game.ctx.drawImage(this.worldCanvas, 0, 0, canvas.width, canvas.height);
    game.ctx.restore();

    if (game.state === STATE.PLAYING || game.state === STATE.PAUSED) {
      drawHUD(game.ctx, game);
      drawEnemyAnnouncement(game.ctx, game);
      drawJoystick(game.ctx, game.input.getJoystickVisual());
    }
  }

  drawGrid(game) {
    const { ctx, canvas, camera } = game;
    const spacing = 64;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;

    const offsetX = ((camera.x % spacing) + spacing) % spacing;
    const offsetY = ((camera.y % spacing) + spacing) % spacing;

    for (let x = -offsetX; x < canvas.width; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = -offsetY; y < canvas.height; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawWorld(game) {
    const { ctx, camera } = game;
    const half = WORLD.size / 2;
    const topLeft = camera.worldToScreen(-half, -half);
    ctx.save();
    ctx.strokeStyle = 'rgba(200,60,70,0.25)';
    ctx.lineWidth = 3;
    ctx.strokeRect(topLeft.x, topLeft.y, WORLD.size, WORLD.size);
    ctx.restore();

    for (const effect of game.auraEffects) {
      const screen = camera.worldToScreen(effect.x, effect.y);
      const progress = effect.age / effect.life;
      ctx.save();
      ctx.globalAlpha = 0.25 * (1 - progress);
      ctx.strokeStyle = '#a8e6a1';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, effect.radius * (0.7 + 0.3 * progress), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const effect of game.shockwaves) {
      const screen = camera.worldToScreen(effect.x, effect.y);
      const progress = effect.radius / effect.maxRadius;
      ctx.save();
      ctx.globalAlpha = 0.55 * (1 - progress);
      ctx.strokeStyle = '#ffb347';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, effect.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.2 * (1 - progress);
      ctx.fillStyle = '#ff7a3a';
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, effect.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    game.pickupPool.forEachActive((pickup) => {
      if (!camera.isVisible(pickup.x, pickup.y, pickup.radius)) return;
      const screen = camera.worldToScreen(pickup.x, pickup.y);
      pickup.draw(ctx, screen.x, screen.y);
    });

    game.enemyPool.forEachActive((enemy) => {
      if (!camera.isVisible(enemy.x, enemy.y, enemy.radius)) return;
      const screen = camera.worldToScreen(enemy.x, enemy.y);
      enemy.draw(ctx, screen.x, screen.y);
    });

    for (const effect of game.swipeEffects) {
      const screen = camera.worldToScreen(effect.x, effect.y);
      const progress = effect.age / effect.life;
      ctx.save();
      ctx.globalAlpha = 0.7 * (1 - progress);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      const halfArc = (effect.arcDeg * Math.PI) / 360;
      this.drawArc(ctx, screen.x, screen.y, effect.range, effect.angle, halfArc);
      if (effect.bothSides) {
        this.drawArc(ctx, screen.x, screen.y, effect.range, effect.angle + Math.PI, halfArc);
      }
      ctx.restore();
    }

    for (const effect of game.beamEffects) {
      const start = camera.worldToScreen(effect.ax, effect.ay);
      const end = camera.worldToScreen(effect.bx, effect.by);
      const progress = effect.age / effect.life;
      ctx.save();
      ctx.globalAlpha = 0.9 * (1 - progress);
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = effect.width;
      ctx.lineCap = 'round';
      ctx.shadowColor = effect.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.restore();
    }

    const playerScreen = camera.worldToScreen(game.player.x, game.player.y);
    game.player.draw(ctx, playerScreen.x, playerScreen.y);
    if (game.player.ultimate) game.player.ultimate.draw(ctx, camera, game.player);

    game.projectilePool.forEachActive((projectile) => {
      if (!camera.isVisible(projectile.x, projectile.y, projectile.radius)) return;
      const screen = camera.worldToScreen(projectile.x, projectile.y);
      projectile.draw(ctx, screen.x, screen.y);
    });

    game.particlePool.forEachActive((particle) => {
      const screen = camera.worldToScreen(particle.x, particle.y);
      particle.draw(ctx, screen.x, screen.y);
    });

    drawPlayerDashBars(ctx, game.player, playerScreen.x, playerScreen.y);
    drawUltimateReadyIcon(ctx, game.player, playerScreen.x, playerScreen.y, game.ultimateInfinityTimer);
  }

  drawArc(ctx, centerX, centerY, radius, centerAngle, halfArc) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, centerAngle - halfArc, centerAngle + halfArc);
    ctx.stroke();
  }
}
