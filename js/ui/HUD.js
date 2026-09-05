// ============================================================
// HUD — drawn straight onto the game canvas every frame.
// Kept as pure draw functions: no state, just reads `game`.
// ============================================================

import { COLORS, DASH, ULTIMATE } from '../config.js';

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function drawHUD(ctx, game) {
  const { player, canvas } = game;
  const w = canvas.width;

  ctx.save();

  // --- Top bar background ---
  ctx.fillStyle = 'rgba(10,5,8,0.55)';
  ctx.fillRect(0, 0, w, 54);

  // --- HP bar ---
  const hpBarX = 14, hpBarY = 12, hpBarW = 220, hpBarH = 14;
  ctx.fillStyle = COLORS.hpBarBack;
  ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
  const hpPct = Math.max(0, player.hp / player.maxHp);
  ctx.fillStyle = COLORS.hpBar;
  ctx.fillRect(hpBarX, hpBarY, hpBarW * hpPct, hpBarH);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 11px "Inter", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${Math.ceil(player.hp)} / ${player.maxHp}`, hpBarX + 6, hpBarY + hpBarH - 3);

  // --- XP bar ---
  const xpBarY = 30, xpBarH = 8;
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
  ctx.fillText(formatTime(player.survivalTime), w / 2, 33);

  const activePowerUps = [];
  if (game.megaMagnetTimer > 0) {
    activePowerUps.push({ label: `IMAN ${game.megaMagnetTimer.toFixed(1)}s`, color: '#d69cff' });
  }
  if (game.enemyFreezeTimer > 0) {
    activePowerUps.push({ label: `HIELO ${game.enemyFreezeTimer.toFixed(1)}s`, color: '#78e7ff' });
  }
  if (activePowerUps.length > 0) {
    ctx.font = 'bold 10px "Inter", sans-serif';
    const labelsWidth = activePowerUps.reduce(
      (total, powerUp) => total + ctx.measureText(powerUp.label).width,
      0
    );
    const gap = 12;
    let powerUpX = w / 2 - (labelsWidth + gap * (activePowerUps.length - 1)) / 2;
    ctx.textAlign = 'left';
    for (const powerUp of activePowerUps) {
      ctx.fillStyle = powerUp.color;
      ctx.fillText(powerUp.label, powerUpX, 49);
      powerUpX += ctx.measureText(powerUp.label).width + gap;
    }
  }

  // --- Kill count (right) ---
  ctx.textAlign = 'right';
  ctx.font = 'bold 14px "Inter", sans-serif';
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`💀 ${player.kills}`, w - 14, 33);

  // --- Weapon icons row (bottom-left) ---
  const iconY = canvas.height - 34;
  let iconX = 14;
  ctx.textAlign = 'left';
  for (const weapon of player.weapons) {
    ctx.fillStyle = 'rgba(10,5,8,0.6)';
    ctx.fillRect(iconX, iconY, 26, 26);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.strokeRect(iconX, iconY, 26, 26);
    ctx.font = '16px sans-serif';
    ctx.fillText(weapon.icon, iconX + 4, iconY + 19);
    ctx.font = 'bold 9px "Inter", sans-serif';
    ctx.fillStyle = COLORS.gold;
    ctx.fillText(String(weapon.level), iconX + 18, iconY + 25);
    iconX += 30;
  }
  for (const passive of player.passives) {
    ctx.fillStyle = 'rgba(10,5,8,0.6)';
    ctx.fillRect(iconX, iconY, 26, 26);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.strokeRect(iconX, iconY, 26, 26);
    ctx.font = '16px sans-serif';
    ctx.fillText(passive.icon, iconX + 4, iconY + 19);
    ctx.font = 'bold 9px "Inter", sans-serif';
    ctx.fillStyle = '#9fd3e8';
    ctx.fillText(String(passive.level), iconX + 18, iconY + 25);
    iconX += 30;
  }

  // Ultimate (bottom-right)
  ctx.textAlign = 'right';
  const ultX = canvas.width - 14;
  const ultY = canvas.height - 34;
  if (!player.ultimate) {
    ctx.fillStyle = 'rgba(244,236,224,0.5)';
    ctx.font = 'bold 11px "Inter", sans-serif';
    ctx.fillText(
      player.level < ULTIMATE.unlockLevel
        ? `Definitiva al Nv. ${ULTIMATE.unlockLevel}`
        : 'Elige definitiva',
      ultX,
      ultY + 16
    );
  } else {
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 11px "Inter", sans-serif';
    ctx.fillText(`${player.ultimate.icon} Lv.${player.ultimate.level}`, ultX, ultY);
    const barW = 120;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(ultX - barW, ultY + 6, barW, 8);
    const ready = player.ultimate.isReady();
    const cd = player.ultimate.stats.cooldownMs;
    const pct = ready ? 1 : 1 - Math.max(0, player.ultimate.cooldownTimer) / cd;
    ctx.fillStyle = ready ? '#e8b13a' : '#7ec6e0';
    ctx.fillRect(ultX - barW, ultY + 6, barW * pct, 8);

    if (ready && player.alive) {
      const bannerW = 232;
      const bannerX = (w - bannerW) / 2;
      ctx.fillStyle = 'rgba(24,16,12,0.94)';
      ctx.fillRect(bannerX, 66, bannerW, 48);
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 1;
      ctx.strokeRect(bannerX, 66, bannerW, 48);
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(bannerX, 66, 3, 48);
      ctx.textAlign = 'center';
      ctx.font = 'bold 15px "Inter", sans-serif';
      ctx.fillText('ULTIMATE LISTA', w / 2, 87);
      ctx.fillStyle = COLORS.text;
      ctx.font = '11px "Inter", sans-serif';
      ctx.fillText('Q / E / R  ·  Botón Ult', w / 2, 104);
    }
  }

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
