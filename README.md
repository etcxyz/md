<div align="center">

  <h1>CAS EMD</h1>
  <p><strong>Media Downloader & YouTube / Spotify Scraper for Node.js</strong></p>

  <p>
    <a href="https://t.me/etcxyz">
      <img src="https://cdn.simpleicons.org/telegram/26A5E4" width="20" height="20" alt="Telegram">
      <strong>@etcxyz</strong>
    </a>
  </p>

  <p>
    <a href="https://www.npmjs.com/package/@etcxyz">
      <img src="https://img.shields.io/npm/v/@etcxyz?style=for-the-badge&label=npm" alt="npm version">
    </a>
    <a href="https://www.npmjs.com/package/@etcxyz">
      <img src="https://img.shields.io/npm/dm/@etcxyz?style=for-the-badge" alt="npm downloads">
    </a>
    <img src="https://img.shields.io/node/v/@etcxyz?style=for-the-badge" alt="Node.js version">
    <img src="https://img.shields.io/npm/l/@etcxyz?style=for-the-badge" alt="License">
  </p>

  <p>
    <a href="#-quick-start">Quick Start</a>
    &nbsp;•&nbsp;
    <a href="#-api-overview">API</a>
    &nbsp;•&nbsp;
    <a href="#-quality">Quality</a>
    &nbsp;•&nbsp;
    <a href="#-examples">Examples</a>
    &nbsp;•&nbsp;
    <a href="#-troubleshooting">Troubleshooting</a>
  </p>

</div>

---

## Overview

**CAS EMD** is a CommonJS Node.js module that exposes one main interface:

```js
const { casemd } = require("@etcxyz");
```

The `casemd(command, query, options)` interface routes requests for YouTube, TikTok, and Spotify features through a compact command-based API.

The current implementation supports:

- YouTube audio download links
- YouTube video download links
- YouTube search
- YouTube video metadata
- YouTube channel metadata
- TikTok media links
- Spotify track, album, and playlist processing
- MP3 conversion and ID3 tagging for Spotify flows
- Album artwork embedding for generated MP3 files
- Sequential and fast album download modes
- Progress callbacks for Spotify album/playlist downloads

> [!IMPORTANT]
> This project depends on external services and HTML/data structures that can change without notice. Treat provider availability and response formats as runtime dependencies.

---

## ✨ Features

<table>
  <tr>
    <td width="33%">
      <h3>YouTube</h3>
      <p>Search, metadata, channels, MP3 links, and MP4 links through one interface.</p>
    </td>
    <td width="33%">
      <h3>TikTok</h3>
      <p>Resolve video, watermark, and music URLs from the configured provider.</p>
    </td>
    <td width="33%">
      <h3>Spotify</h3>
      <p>Process tracks, albums, and playlists into tagged MP3 files.</p>
    </td>
  </tr>
  <tr>
    <td width="33%">
      <h3>Metadata</h3>
      <p>Titles, artists, channels, thumbnails, statistics, dates, tags, and artwork.</p>
    </td>
    <td width="33%">
      <h3>Quality</h3>
      <p>Audio: 92 / 128 / 256 / 320 kbps. Video: 144 / 360 / 480 / 720 / 1080p.</p>
    </td>
    <td width="33%">
      <h3>Integration</h3>
      <p>Designed to be dropped into bots, REST APIs, web apps, and Node.js services.</p>
    </td>
  </tr>
</table>

---

## 📦 Installation

### 1. Install the package

```bash
npm install @etcxyz
```

For local development:

```bash
npm install
```

### 2. Install FFmpeg

Spotify MP3 processing and some media conversion flows require the **FFmpeg binary** to be available on the system.

Verify:

```bash
ffmpeg -version
```

Linux:

```bash
sudo apt update
sudo apt install ffmpeg
```

macOS with Homebrew:

```bash
brew install ffmpeg
```

Windows:

```powershell
winget install Gyan.FFmpeg
```

> `crypto`, `fs`, and `os` are built-in Node.js modules. They are not npm dependencies.

---

## 🚀 Quick Start

```js
"use strict";

const { casemd } = require("@etcxyz");

async function main() {
    const result = await casemd(
        "ytmp3",
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        {
            quality: 320
        }
    );

    console.log(result);
}

main().catch(console.error);
```

A successful response follows this general shape:

```json
{
  "status": true,
  "creator": "@etcxyz",
  "metadata": {},
  "download": {
    "status": true,
    "quality": "320kbps",
    "availableQuality": [92, 128, 256, 320],
    "url": "https://...",
    "filename": "Video Title (320kbps).mp3"
  }
}
```

The requested `320` value is a conversion/download quality requested from the configured provider; it should not be interpreted as a guarantee that the original source audio itself was encoded at 320 kbps.

---

## 🧭 API Overview

### Main interface

```js
const result = await casemd(command, query, options);
```

| Parameter | Type | Description |
|---|---|---|
| `command` | `string` | Command name or alias |
| `query` | `string` | URL, ID, username, or search text |
| `options` | `object` | Optional command-specific settings |

### Commands

| Command | Alias | Purpose |
|---|---|---|
| `yt` | `ytmp4` | YouTube video link |
| `ytmp3` | `yta` | YouTube audio link |
| `tt` | `tiktok` | TikTok media links |
| `spotify` | `sp` | Spotify track, album, or playlist |
| `search` | — | YouTube search |
| `metadata` | `meta` | YouTube video metadata |
| `channel` | — | YouTube channel metadata |

---

# 🎥 YouTube

## YouTube MP3

```js
const result = await casemd(
    "ytmp3",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    {
        quality: 128
    }
);

console.log(result);
```

Accepted quality values:

```js
[92, 128, 256, 320]
```

Invalid values fall back to:

```text
128 kbps
```

Example:

```js
await casemd("ytmp3", url, { quality: 320 });
```

Response:

```json
{
  "status": true,
  "creator": "@etcxyz",
  "metadata": {
    "..."
  },
  "download": {
    "status": true,
    "quality": "128kbps",
    "availableQuality": [92, 128, 256, 320],
    "url": "https://...",
    "filename": "Title (128kbps).mp3"
  }
}
```

## YouTube MP4

```js
const result = await casemd(
    "ytmp4",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    {
        quality: 720
    }
);

console.log(result);
```

Accepted quality values:

```js
[144, 360, 480, 720, 1080]
```

Invalid values fall back to:

```text
360p
```

Response:

```json
{
  "status": true,
  "quality": "720p",
  "availableQuality": [144, 360, 480, 720, 1080],
  "url": "https://...",
  "filename": "Title (720p).mp4"
}
```

---

# 🔎 YouTube Search

```js
const result = await casemd(
    "search",
    "Alan Walker Faded"
);

console.log(result);
```

Response:

```json
{
  "status": true,
  "creator": "@etcxyz",
  "results": [
    {
      "type": "video",
      "videoId": "...",
      "title": "..."
    }
  ]
}
```

The `results` array follows the response structure returned by `yt-search`.

---

# 🧾 YouTube Metadata

```js
const result = await casemd(
    "metadata",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
);

console.log(result);
```

Returned fields include:

```text
status
creator
id
channel_id
channel_title
title
description
thumbnails
tags
published_date
published_format
statistics
```

Example:

```json
{
  "status": true,
  "creator": "@etcxyz",
  "id": "dQw4w9WgXcQ",
  "channel_id": "...",
  "channel_title": "...",
  "title": "...",
  "description": "...",
  "thumbnails": [],
  "tags": [],
  "published_date": "2026-01-01T00:00:00Z",
  "published_format": "01 Jan 2026 07:00 WIB",
  "statistics": {
    "like": "...",
    "view": "...",
    "favorit": "...",
    "comment": "..."
  }
}
```

Dates are formatted for `Asia/Jakarta` and returned with `WIB`.

---

# 📺 YouTube Channel

The `channel` command accepts a channel URL or an input such as `@username`.

```js
const result = await casemd(
    "channel",
    "@youtube"
);

console.log(result);
```

URL input is supported too:

```js
const result = await casemd(
    "channel",
    "https://www.youtube.com/@channel"
);
```

Returned fields include:

```text
status
creator
id
title
description
username
thumbnails
banner
published_date
published_format
statistics
```

Example statistics:

```json
{
  "statistics": {
    "view": "123456",
    "video": "123",
    "subscriber": "12345"
  }
}
```

---

# 🎵 TikTok

```js
const result = await casemd(
    "tiktok",
    "https://www.tiktok.com/@username/video/123456789"
);

console.log(result);
```

Response:

```json
{
  "status": true,
  "wm": "https://www.tikwm.com/...",
  "music": "https://www.tikwm.com/...",
  "video": "https://www.tikwm.com/..."
}
```

| Field | Meaning |
|---|---|
| `wm` | Video URL with watermark |
| `music` | Music/audio URL |
| `video` | Video URL returned by the provider |

---

# 🟢 Spotify

The Spotify interface accepts:

- Track URL
- Album URL
- Playlist URL

```js
const result = await casemd(
    "spotify",
    "https://open.spotify.com/track/xxxxxxxxxxxxxxxxxxxxxx",
    {
        outputPath: "./downloads/",
        sync: true
    }
);

console.log(result);
```

## Spotify Track

The library extracts:

```text
title
artist
year
album
id
albumCoverURL
trackNumber
```

Example:

```json
{
  "status": true,
  "type": "track",
  "info": {
    "title": "Song Title",
    "artist": "Artist Name",
    "year": "2026-01-01",
    "album": "Album Name",
    "id": "YOUTUBE_VIDEO_ID",
    "albumCoverURL": "https://...",
    "trackNumber": 1
  },
  "download": [
    {
      "status": "Success",
      "filename": "downloads/Song Title.mp3"
    }
  ]
}
```

## Spotify Album

```js
const result = await casemd(
    "spotify",
    "https://open.spotify.com/album/xxxxxxxxxxxxxxxxxxxxxx",
    {
        outputPath: "./downloads/",
        sync: true
    }
);

console.log(result);
```

Album metadata:

```json
{
  "name": "Album Name",
  "artist": "Artist Name",
  "year": "2026-01-01",
  "tracks": [
    {
      "title": "Track 1",
      "id": "YOUTUBE_ID",
      "trackNumber": 1
    }
  ],
  "albumCoverURL": "https://..."
}
```

### Fast album mode

Set `sync` to `false`:

```js
const result = await casemd(
    "spotify",
    "https://open.spotify.com/album/xxxxxxxxxxxxxxxxxxxxxx",
    {
        outputPath: "./downloads/",
        sync: false
    }
);
```

The current implementation uses:

- `sync: true` → sequential download flow
- `sync: false` → parallel/fast album flow

### Album callback

```js
await casemd(
    "spotify",
    "https://open.spotify.com/album/xxxxxxxxxxxxxxxxxxxxxx",
    {
        outputPath: "./downloads/",
        sync: true,
        callback: (progress) => {
            console.log(progress);
        }
    }
);
```

Success callback:

```json
{
  "success": true,
  "filename": "./downloads/Track 1.mp3",
  "name": "Track 1"
}
```

Failure callback:

```json
{
  "success": false,
  "reason": "stream",
  "filename": "./downloads/Track 1.mp3",
  "name": "Track 1"
}
```

Possible callback reasons:

```text
stream
tags
```

## Spotify Playlist

```js
const result = await casemd(
    "spotify",
    "https://open.spotify.com/playlist/xxxxxxxxxxxxxxxxxxxxxx",
    {
        outputPath: "./downloads/",
        callback: (progress) => {
            console.log(progress);
        }
    }
);

console.log(result);
```

Playlist metadata:

```json
{
  "name": "My Playlist",
  "owner": "Owner Name",
  "description": "Playlist description",
  "followerCount": 1000,
  "trackCount": 20,
  "tracks": [
    {
      "title": "Song",
      "artist": "Artist",
      "album": "Album",
      "id": "YOUTUBE_ID",
      "albumCoverURL": "https://...",
      "trackNumber": 1
    }
  ],
  "playlistCoverURL": "https://..."
}
```

---

# 🧩 Alias Reference

```js
await casemd("yt", url);
await casemd("ytmp4", url);

await casemd("ytmp3", url);
await casemd("yta", url);

await casemd("tt", url);
await casemd("tiktok", url);

await casemd("spotify", url);
await casemd("sp", url);

await casemd("search", "kata pencarian");

await casemd("metadata", url);
await casemd("meta", url);

await casemd("channel", input);
```

---

# 🎚️ Quality

## Audio

```js
[92, 128, 256, 320]
```

Example:

```js
await casemd(
    "ytmp3",
    url,
    {
        quality: 320
    }
);
```

Fallback:

```text
Invalid quality → 128 kbps
```

## Video

```js
[144, 360, 480, 720, 1080]
```

Example:

```js
await casemd(
    "ytmp4",
    url,
    {
        quality: 1080
    }
);
```

Fallback:

```text
Invalid quality → 360p
```

---

# 📁 Spotify Output Path

`outputPath` is used as the destination directory for generated Spotify MP3 files.

```js
await casemd(
    "spotify",
    spotifyUrl,
    {
        outputPath: "./downloads/"
    }
);
```

The target directory must already exist because the current implementation validates the path before writing.

Expected layout:

```text
project/
├── index.js
├── package.json
├── README.md
└── downloads/
```

Absolute paths work:

```js
outputPath: "/home/user/downloads/"
```

Home-directory paths using `~` are also supported:

```js
outputPath: "~/downloads/"
```

---

# 🔌 Express Integration

```js
const express = require("express");
const { casemd } = require("@etcxyz");

const app = express();

app.use(express.json());

app.get("/api/youtube/mp3", async (req, res) => {
    const { url, quality } = req.query;

    const result = await casemd(
        "ytmp3",
        url,
        {
            quality: Number(quality) || 128
        }
    );

    res.json(result);
});

app.get("/api/youtube/metadata", async (req, res) => {
    const { url } = req.query;

    const result = await casemd("metadata", url);

    res.json(result);
});

app.get("/api/youtube/search", async (req, res) => {
    const { q } = req.query;

    const result = await casemd("search", q);

    res.json(result);
});

app.get("/api/tiktok", async (req, res) => {
    const { url } = req.query;

    const result = await casemd("tiktok", url);

    res.json(result);
});

app.listen(3000, () => {
    console.log("Server berjalan di port 3000");
});
```

Example request:

```text
GET /api/youtube/mp3?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ&quality=320
```

---

# 🛡️ Error Handling

Most commands return:

```json
{
  "status": false,
  "message": "..."
}
```

Invalid URL:

```json
{
  "status": false,
  "message": "Parameter link tidak valid!"
}
```

Unknown command:

```json
{
  "status": false,
  "message": "Command tidak dikenal"
}
```

Spotify errors may include the underlying operation in a string such as:

```text
Caught: ErrorName | ErrorMessage
```

A normal application integration should still use `try/catch` around the main call:

```js
try {
    const result = await casemd(
        "ytmp3",
        url,
        {
            quality: 256
        }
    );

    console.log(result);
} catch (error) {
    console.error(error);
}
```

---

# 🧪 Development

The package includes lightweight validation scripts.

Run a syntax check:

```bash
npm run check
```

Run the test script:

```bash
npm test
```

Before publishing, npm automatically runs:

```bash
npm run check
```

The current repository does not include a full automated integration test suite, so `npm test` currently performs a syntax validation of `index.js`.

---

# 🏗️ Internal Flow

## YouTube MP3 / MP4

```text
YouTube URL
    ↓
Extract video ID
    ↓
yt-search
    ↓
Configured SaveTube provider
    ↓
Decode provider response
    ↓
Download URL
    ↓
Result object
```

## YouTube Metadata

```text
YouTube URL
    ↓
Extract video ID
    ↓
ytapi.apps.mattw.io
    ↓
Video metadata
    ↓
Asia/Jakarta date formatting
    ↓
Result object
```

## YouTube Channel

```text
URL / @username
    ↓
Resolve channel
    ↓
ytapi.apps.mattw.io
    ↓
Channel metadata
    ↓
Result object
```

## Spotify

```text
Spotify URL
    ↓
Detect track / album / playlist
    ↓
Read Spotify page data
    ↓
Search matching tracks in YouTube Music
    ↓
Resolve YouTube video IDs
    ↓
Download audio
    ↓
ID3 tags
    ↓
Album artwork
    ↓
MP3
```

---

# 🧱 Architecture

The public API intentionally stays small:

```js
const { casemd } = require("@etcxyz");
```

Internally, the module separates responsibilities into focused operations:

| Area | Internal responsibility |
|---|---|
| Routing | `casemd()` command dispatcher |
| YouTube | Search, download, metadata, channel |
| TikTok | Provider-based media URL resolution |
| Spotify | Track/album/playlist extraction |
| Media | FFmpeg conversion |
| Tags | ID3 metadata and cover embedding |
| Validation | URL, object type, path, and quality checks |

Only `casemd` is exported by the current `index.js`.

---

# 📦 Package Information

Current package metadata is designed for CommonJS consumption:

```js
const { casemd } = require("@etcxyz");
```

The package also exposes an explicit package export:

```json
{
  "exports": {
    ".": "./index.js"
  }
}
```

This keeps the public import surface predictable for downstream projects.

---

# 🌐 External Providers

The current implementation communicates with external services, including:

- YouTube pages and services
- YouTube Music
- SaveTube provider infrastructure
- TikTok provider infrastructure
- `ytapi.apps.mattw.io`

Because these providers are external, changes to their APIs, HTML, anti-bot systems, response schemas, availability, or rate limits can affect the library.

For production deployments, add your own:

```text
timeouts
retries
rate limits
caching
logging
monitoring
provider fallbacks
input validation
```

around the library as appropriate for your application.

---

# ⚠️ Production Notes

This package is suitable as a reusable building block, but a mass-deployment setup should not blindly assume every provider will remain stable forever.

Recommended repository-level upgrades for a future major release:

- Automated unit tests
- Provider health checks
- Typed return schemas
- Centralized HTTP configuration
- Request timeout handling
- Retry/backoff strategy
- Better error classes
- Structured logging
- Concurrency limits
- Cache support
- CI on GitHub Actions
- Release automation
- Changelog generation
- Dependabot/Renovate updates
- ESM support in addition to CommonJS
- TypeScript declarations

These are future architectural improvements and are not part of the current public API.

---

# 🤝 Contributing

Contributions are welcome.

A good contribution should:

1. Keep the public API backward-compatible where possible.
2. Update the README when behavior changes.
3. Add regression coverage for bug fixes once a test suite is introduced.
4. Keep provider-specific code isolated so future provider changes are easier to maintain.

Typical workflow:

```bash
git clone <repository-url>
cd <repository-directory>

npm install
npm test
```

Then create a branch, make your changes, validate the package, and open a pull request.

---

# 📜 License

This project is released under the **MIT License**.

Third-party packages and external providers retain their own licenses and terms.

Use the library only for content and workflows you are authorized to access or process, and comply with applicable platform rules, copyright requirements, and local law.

---

<div align="center">

  <h3>CAS EMD</h3>
  <p>Built for reusable Node.js media tooling.</p>

  <a href="https://t.me/etcxyz">
    <img src="https://cdn.simpleicons.org/telegram/26A5E4" width="18" height="18" alt="Telegram">
    @etcxyz
  </a>

</div>
