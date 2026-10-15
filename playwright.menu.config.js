import { defineConfig } from '@playwright/test';
import base from './playwright.config.js';

// Exercise the built application, not Vite's development/HMR runtime.
// Software WebGL is explicit on GPU-less runners; game geometry stays unchanged.
export default defineConfig({
  ...base,
  testMatch: '**/menu-return.spec.js',
  retries: 0,
  use: { ...base.use, video: 'off' },
  webServer: {
    ...base.webServer,
    command: 'npm run build && npx vite preview --host 127.0.0.1 --port 4173',
    reuseExistingServer: false,
  },
  projects: base.projects.filter(project => ['chromium-desktop', 'mobile-chrome'].includes(project.name)).map(project => ({
    ...project,
    use: {
      ...project.use,
      launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
    },
  })),
});
