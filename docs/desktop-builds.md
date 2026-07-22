# Desktop and PWA builds

## PWA

`npm run build` emits the manifest, icon and versioned service worker alongside
the bundled application. The worker uses a small shell cache and a
network-first navigation strategy so an updated deployment is not permanently
hidden behind stale cached HTML.

## Tauri 2 development

Install the native prerequisites documented by Tauri for your operating system,
then run:

```bash
npm ci
npm run desktop:dev
```

Create a local bundle with:

```bash
npm run desktop:build
```

The frontend switches to a relative Vite base inside Tauri while GitHub Pages
keeps its repository subpath.

## Release workflow

`.github/workflows/release-desktop.yml` runs manually or for tags matching
`v*`. Its matrix targets:

- Windows x64;
- Linux x64 AppImage and `.deb`;
- macOS Intel;
- macOS Apple Silicon.

The workflow creates a **draft prerelease** and labels artifacts as unsigned.
This repository does not yet contain Windows signing credentials, Apple
Developer certificates or notarization secrets. A workflow definition is not a
downloadable release: links should be exposed in the game only after GitHub
actually reports matching release assets.
