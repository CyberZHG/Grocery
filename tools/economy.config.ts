import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { include: ['tools/economy.sim.ts'], testTimeout: 600000 } });
