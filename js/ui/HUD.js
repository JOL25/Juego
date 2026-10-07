// ============================================================
// HUD — drawn straight onto the game canvas every frame.
// Kept as pure draw functions: no state, just reads `game`.
// ============================================================

import { COLORS, DASH, ULTIMATE, ENEMY_ANNOUNCEMENT } from '../config.js';
import { drawPixelSprite } from '../rendering/PixelArt.js';
import { drawUpgradeIcon, getUpgradePalette } from './UpgradeIcon.js';
import { t, getLanguage } from './i18n.js';

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function drawHUD(ctx, game) {
  const { player, canvas } = game;
  // Draw the interface in CSS pixels so mobile text stays readable.
  const displayWidth = canvas.clientWidth || canvas.width;
  const leftInset = game.safeArea?.left || 0;
  const w = displayWidth - leftInset - (game.safeArea?.right || 0);
  const h = canvas.clientHeight || canvas.height;
  const compact = w < 700;
  const controlSpace = game.touchControls ? 124 : 34;
  const topInset = game.safeArea?.top || 0;
  const bottomInset = game.safeArea?.bottom || 0;

  ctx.save();
  ctx.scale(canvas.width / displayWidth, canvas.height / h);
  ctx.translate(leftInset, topInset);

  // --- Top bar background ---
  ctx.fillStyle = 'rgba(10,5,8,0.55)';
  ctx.fillRect(-leftInset, 0, displayWidth, compact ? 88 : 54);

  // --- HP bar ---
  const hpBarX = 14, hpBarY = 12, hpBarW = compact ? Math.min(180, w * 0.42) : 220, hpBarH = 16;
  ctx.fillStyle = COLORS.hpBarBack;
  ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
  const hpPct = Math.max(0, player.hp / player.maxHp);
  ctx.fillStyle = COLORS.hpBar;
  ctx.fillRect(hpBarX, hpBarY, hpBarW * hpPct, hpBarH);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 12px "Inter", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${Math.ceil(player.hp)} / ${player.maxHp}`, hpBarX + 6, hpBarY + hpBarH - 3);

  // --- XP bar ---
  const xpBarY = 32, xpBarH = 8;
  ctx.fillStyle = COLORS.xpBarBack;
  ctx.fillRect(hpBarX, xpBarY, hpBarW, xpBarH);
  const xpPct = Math.max(0, Math.min(1, player.xp / player.xpToNext));
  ctx.fillStyle = COLORS.xpBar;
  ctx.fillRect(hpBarX, xpBarY, hpBarW * xpPct, xpBarH);
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.strokeRect(hpBarX, xpBarY, hpBarW, xpBarH);

  // --- Level badge ---
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 13px "Cinzel", serif';
  ctx.fillText(`Lv. ${player.level}`, hpBarX + hpBarW + 12, 24);

  // --- Timer (center) ---
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 20px "Cinzel", serif';
  ctx.textAlign = 'center';
  ctx.fillText(formatTime(player.survivalTime), w / 2, compact ? 65 : 33);

  const activePowerUps = [];
  if (game.megaMagnetTimer > 0) {
    activePowerUps.push({ label: `${t('IMAN')} ${game.megaMagnetTimer.toFixed(1)}s`, color: '#d69cff' });
  }
  if (game.enemyFreezeTimer > 0) {
    activePowerUps.push({ label: `${t('HIELO')} ${game.enemyFreezeTimer.toFixed(1)}s`, color: '#78e7ff' });
  }
  if (activePowerUps.length > 0) {
    ctx.font = 'bold 12px "Inter", sans-serif';
    const labelsWidth = activePowerUps.reduce(
      (total, powerUp) => total + ctx.measureText(powerUp.label).width,
      0
    );
    const gap = 12;
    let powerUpX = w / 2 - (labelsWidth + gap * (activePowerUps.length - 1)) / 2;
    ctx.textAlign = 'left';
    for (const powerUp of activePowerUps) {
      ctx.fillStyle = powerUp.color;
      ctx.fillText(powerUp.label, powerUpX, compact ? 81 : 49);
      powerUpX += ctx.measureText(powerUp.label).width + gap;
    }
  }

  // --- Kill count (right) ---
  ctx.textAlign = compact ? 'left' : 'right';
  ctx.font = 'bold 14px "Inter", sans-serif';
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`💀 ${player.kills}`, compact ? 14 : w - 68, compact ? 65 : 33);

  // --- Weapon icons row (bottom-left) ---
  const columns = Math.max(1, Math.floor((w - 28) / 30));
  const rows = Math.ceil((player.weapons.length + player.passives.length) / columns);
  const iconY = h - controlSpace - bottomInset - topInset - Math.max(0, rows - 1) * 30;
  let iconX = 14;
  let itemIndex = 0;
  ctx.textAlign = 'left';
  for (const weapon of player.weapons) {
    const itemY = iconY + Math.floor(itemIndex / columns) * 30;
    iconX = 14 + (itemIndex % columns) * 30;
    ctx.fillStyle = 'rgba(10,5,8,0.6)';
    ctx.fillRect(iconX, itemY, 26, 26);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.strokeRect(iconX, itemY, 26, 26);
    drawUpgradeIcon(ctx, weapon.id, iconX + 1, itemY + 1);
    ctx.font = 'bold 11px "Inter", sans-serif';
    ctx.fillStyle = getUpgradePalette(weapon.id)[1];
    ctx.fillText(String(weapon.level), iconX + 18, itemY + 25);
    itemIndex += 1;
  }
  for (const passive of player.passives) {
    const itemY = iconY + Math.floor(itemIndex / columns) * 30;
    iconX = 14 + (itemIndex % columns) * 30;
    ctx.fillStyle = 'rgba(10,5,8,0.6)';
    ctx.fillRect(iconX, itemY, 26, 26);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.strokeRect(iconX, itemY, 26, 26);
    drawUpgradeIcon(ctx, passive.id, iconX + 1, itemY + 1);
    ctx.font = 'bold 11px "Inter", sans-serif';
    ctx.fillStyle = getUpgradePalette(passive.id)[1];
    ctx.fillText(String(passive.level), iconX + 18, itemY + 25);
    itemIndex += 1;
  }

  // Ultimate (bottom-right)
  ctx.textAlign = 'right';
  const ultX = w - 14;
  const ultY = compact ? iconY - 24 : iconY;
  if (!player.ultimate) {
    ctx.fillStyle = 'rgba(244,236,224,0.5)';
    ctx.font = 'bold 11px "Inter", sans-serif';
    ctx.fillText(
      player.level < ULTIMATE.unlockLevel
        ? `${t('Definitiva al Nv.')} ${ULTIMATE.unlockLevel}`
        : t('Elige definitiva'),
      ultX,
      ultY + 16
    );
  } else {
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 11px "Inter", sans-serif';
    drawUpgradeIcon(ctx, player.ultimate.id, ultX - 80, ultY - 20, 20);
    ctx.fillStyle = getUpgradePalette(player.ultimate.id)[1];
    ctx.fillText(`Lv.${player.ultimate.level}`, ultX, ultY);
    const barW = 120;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(ultX - barW, ultY + 6, barW, 8);
    const ready = player.ultimate.isReady();
    const cd = player.ultimate.stats.cooldownMs;
    const pct = ready ? 1 : 1 - Math.max(0, player.ultimate.cooldownTimer) / cd;
    ctx.fillStyle = getUpgradePalette(player.ultimate.id)[ready ? 1 : 2];
    ctx.fillRect(ultX - barW, ultY + 6, barW * pct, 8);

  }

  ctx.restore();
}

export function drawEnemyAnnouncement(ctx, game) {
  const displayWidth = game.canvas.clientWidth || game.canvas.width;
  const leftInset = game.safeArea?.left || 0;
  const w = displayWidth - leftInset - (game.safeArea?.right || 0);
  const scale = game.canvas.width / displayWidth;
  ctx.save();
  if (scale !== 1) ctx.scale(scale, scale);
  ctx.translate?.(leftInset, (w < 700 ? 30 : 0) + (game.safeArea?.top || 0));
  drawAnnouncement(ctx, { ...game, canvas: { width: w } });
  ctx.restore();
}

function drawAnnouncement(ctx, game) {
  const mysteryAge = game.powerUpSpawner?.announcementAge;
  if (mysteryAge != null) {
    drawMysteryAnnouncement(ctx, game.canvas, mysteryAge);
    return;
  }
  const announcement = game.spawner.announcement;
  if (!announcement) return;
  const { type, age } = announcement;
  const { durationSeconds, fadeInSeconds, fadeOutSeconds } = ENEMY_ANNOUNCEMENT;
  const opacity = Math.max(0, Math.min(1, age / fadeInSeconds, (durationSeconds - age) / fadeOutSeconds));
  const width = Math.min(400, game.canvas.width - 28);
  const x = (game.canvas.width - width) / 2;
  const y = 68 - 6 * (1 - Math.min(1, age / fadeInSeconds));
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = type.color;
  ctx.fillRect(x, y, width, 62);
  ctx.fillStyle = 'rgba(8,5,12,0.58)';
  ctx.fillRect(x, y, width, 62);
  ctx.strokeStyle = type.color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, 62);
  ctx.fillStyle = type.color;
  ctx.fillRect(x, y, 4, 62);
  drawPixelSprite(ctx, x + 36, y + 31, 16, type.color, '#eadbff', type.vertices);
  ctx.fillStyle = '#ffe45c';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#120a10';
  ctx.shadowBlur = 3;
  ctx.font = 'bold 11px "Inter", sans-serif';
  ctx.fillText(t('HAN EMERGIDO LOS'), x + width / 2 + 22, y + 19, width - 80);
  ctx.font = 'bold 21px "Cinzel", serif';
  ctx.fillText(t(type.plural).toLocaleUpperCase(getLanguage()), x + width / 2 + 22, y + 42);
  ctx.restore();
}

function drawMysteryAnnouncement(ctx, canvas, age) {
  const { durationSeconds, fadeInSeconds, fadeOutSeconds } = ENEMY_ANNOUNCEMENT;
  const width = Math.min(540, canvas.width - 28);
  const x = (canvas.width - width) / 2;
  const y = 68 - 6 * (1 - Math.min(1, age / fadeInSeconds));
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, age / fadeInSeconds, (durationSeconds - age) / fadeOutSeconds));
  ctx.fillStyle = '#ffe45c';
  ctx.fillRect(x, y, width, 62);
  ctx.strokeStyle = '#b88a14';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, 62);
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 40px "Inter", sans-serif';
  ctx.fillText('?', x + 36, y + 32);
  ctx.font = 'bold 17px "Inter", sans-serif';
  ctx.fillText(t('Han aparecido beneficios'), x + width / 2 + 26, y + 21, width - 90);
  ctx.fillText(t('misteriosos en el mapa'), x + width / 2 + 26, y + 43, width - 90);
  ctx.restore();
}

export function drawUltimateReadyIcon(ctx, player, screenX, screenY, infinityRemaining = 0) {
  if (!player.alive) return;
  if (infinityRemaining > 0) {
    ctx.save();
    ctx.font = 'bold 34px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff9a3c';
    ctx.shadowColor = '#ff9a3c';
    ctx.shadowBlur = 10 + Math.sin(infinityRemaining * 6) * 3;
    ctx.fillText('∞', screenX, screenY - player.radius - 24);
    ctx.restore();
    return;
  }
  const ultimate = player.ultimate;
  if (!player.alive || !ultimate?.isReady() || !(ultimate.readyIconTimer > 0)) return;

  const progress = 1 - ultimate.readyIconTimer / ULTIMATE.readyIconDurationSeconds;
  const rise = 1 - Math.pow(1 - progress, 3);
  const scale = 0.55 + 0.45 * Math.min(1, progress / 0.2);
  // Emerge from the body, ease upward, then fade out completely at two seconds.
  ctx.save();
  ctx.translate(screenX, screenY - (player.radius + 38) * rise);
  ctx.scale(scale, scale);
  ctx.globalAlpha = Math.min(1, (1 - progress) / 0.6);
  ctx.font = '28px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.gold;
  ctx.shadowBlur = 0;
  drawUpgradeIcon(ctx, ultimate.id, -16, -16, 32);
  ctx.restore();
}

// Draw after world effects so charges remain visible next to the player.
export function drawPlayerDashBars(ctx, player, screenX, screenY) {
  if (!player.alive) return;
  const barW = 18;
  const barH = 5;
  const gap = 4;
  const x = screenX + player.radius + 10;
  const totalHeight = player.dashMaxCharges * (barH + gap) - gap;
  const top = screenY - totalHeight / 2;
  ctx.save();
  ctx.lineWidth = 1;
  for (let i = 0; i < player.dashMaxCharges; i++) {
    const y = top + i * (barH + gap);
    const charged = i < player.dashCharges;
    const progress = charged ? 1 : i === player.dashCharges
      ? Math.max(0, Math.min(1, player.dashRecharge / DASH.rechargeMs)) : 0;
    ctx.fillStyle = 'rgba(8,12,18,0.9)';
    ctx.fillRect(x - 2, y - 2, barW + 4, barH + 4);
    ctx.fillStyle = charged ? '#9de9ff' : '#467d96';
    ctx.fillRect(x, y, barW * progress, barH);
    ctx.strokeStyle = charged ? '#c9f4ff' : '#51616d';
    ctx.strokeRect(x, y, barW, barH);
  }
  ctx.restore();
}

export function drawJoystick(ctx, visual) {
  if (!visual) return;
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(visual.originX, visual.originY, visual.maxRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(visual.stickX, visual.stickY, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
