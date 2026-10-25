/* Relógio do jogo: 1 dia = 12 min reais (1 min real = 2 h do jogo). Só serve às rotinas dos NPCs por enquanto. */
export const CLOCK = { total: 7 };          // horas absolutas desde o início (começa às 07h)
export const DAY_SECONDS = 720;
export const hourNow = () => CLOCK.total % 24;
export function tickClock(dt) { CLOCK.total += dt * 24 / DAY_SECONDS; }
