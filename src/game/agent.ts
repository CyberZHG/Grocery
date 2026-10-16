import type { Grid, P } from './layout';

export type Dir = 'down' | 'up' | 'left' | 'right';

export class Mover {
  x: number;
  y: number;
  path: P[] = [];
  dir: Dir = 'down';
  walkT = 0;
  moving = false;

  constructor(p: P) {
    this.x = p.x;
    this.y = p.y;
  }

  get tile(): P {
    return { x: Math.round(this.x), y: Math.round(this.y) };
  }

  at(p: P): boolean {
    return this.path.length === 0 && Math.abs(this.x - p.x) < 0.01 && Math.abs(this.y - p.y) < 0.01;
  }

  goTo(grid: Grid, p: P): boolean {
    const t = this.tile;
    const path = grid.path(t, p);
    if (!path) {
      // Target unreachable (e.g. blocked during layout edits); jump to avoid stuck agents.
      this.path = [];
      this.x = p.x;
      this.y = p.y;
      return false;
    }
    // Re-pathing mid-step starts from the rounded tile, so walk back onto it first.
    if (Math.abs(this.x - t.x) > 0.001 || Math.abs(this.y - t.y) > 0.001) path.unshift(t);
    this.path = path;
    return true;
  }

  /** speed in tiles per game minute */
  step(dtMin: number, speed: number): void {
    let budget = dtMin * speed;
    this.moving = this.path.length > 0;
    while (budget > 0 && this.path.length) {
      const n = this.path[0];
      const dx = n.x - this.x;
      const dy = n.y - this.y;
      const d = Math.abs(dx) + Math.abs(dy);
      if (Math.abs(dx) > 0.001) this.dir = dx > 0 ? 'right' : 'left';
      else if (Math.abs(dy) > 0.001) this.dir = dy > 0 ? 'down' : 'up';
      if (d <= budget) {
        this.x = n.x;
        this.y = n.y;
        budget -= d;
        this.path.shift();
      } else {
        this.x += (dx / d) * budget;
        this.y += (dy / d) * budget;
        budget = 0;
      }
    }
    if (this.moving) this.walkT += dtMin * speed;
  }

  face(d: Dir): void {
    this.dir = d;
  }

  frame(): number {
    if (!this.moving && this.path.length === 0) return 0;
    const cycle = [0, 1, 0, 2];
    return cycle[Math.floor(this.walkT * 2.2) % 4];
  }
}
