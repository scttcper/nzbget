# NZBGet

> TypeScript api wrapper for [NZBGet](https://nzbget.com/) using JSON-RPC

### Overview

Includes the normalized usenet API shared through [@ctrl/shared-usenet](https://github.com/scttcper/shared-usenet) and also available in [@ctrl/sabnzbd](https://github.com/scttcper/sabnzbd):

- [`getAllData()`](#getalldata)
- [`getQueue()`](#getqueue)
- [`getHistory()`](#gethistory)
- [`getQueueJob(id)`](#getqueuejobid)
- [`getHistoryJob(id)`](#gethistoryjobid)
- [`findJob(id)`](#findjobid)
- [`addNzbFile(...)` / `addNzbUrl(...)`](#addnzbfile--addnzburl)
- [`normalizedAddNzb(...)`](#normalizedaddnzb)
- queue control methods return `boolean`
- `addNzbFile` and `addNzbUrl` return the normalized queue id as a `string`

Use the normalized methods by default. Drop to the native NZBGet methods only when you need JSON-RPC specific behavior such as raw config access, raw `editQueue` commands, or direct `append` usage.

### Install

```console
npm install @ctrl/nzbget
```

### Use

```ts
import { Nzbget } from '@ctrl/nzbget';

const client = new Nzbget({
  baseUrl: 'http://localhost:6789/',
  username: 'nzbget',
  password: 'tegbzn6789',
});

async function main() {
  const data = await client.getAllData();
  console.log(data.queue);
}
```

### Normalized Example

```ts
import { Nzbget, UsenetNotFoundError, UsenetPriority } from '@ctrl/nzbget';

const client = new Nzbget({
  baseUrl: 'http://localhost:6789/',
  username: 'nzbget',
  password: 'tegbzn6789',
});

async function main() {
  const id = await client.addNzbUrl('https://example.test/release.nzb', {
    category: 'movies',
    priority: UsenetPriority.high,
    startPaused: false,
  });

  try {
    const job = await client.getQueueJob(id);
    console.log(job.state, job.progress);
  } catch (error) {
    if (error instanceof UsenetNotFoundError) {
      console.log('job missing', error.id);
    }
  }
}
```

### API

Docs: https://nzbget.ep.workers.dev  
NZBGet API Docs: https://nzbget.net/api/

### Normalized Methods

##### `getAllData()`

Returns queue, history, categories, scripts, and status in normalized form. This is the broadest normalized read and fits best when you want an overview in one call.

##### `getQueue()`

Returns normalized active queue items.

##### `getHistory()`

Returns normalized history items.

##### `getQueueJob(id)`

Returns one normalized active queue item. Missing ids throw `UsenetNotFoundError`.

##### `getHistoryJob(id)`

Returns one normalized history item. Missing ids throw `UsenetNotFoundError`.

##### `findJob(id)`

Searches queue first, then history, and returns `{ source, job }` or `null`. It is the convenient path when you do not know which side the id should be on.

##### `addNzbFile(...)` / `addNzbUrl(...)`

Add an NZB and return the normalized queue id as a `string`. These are the lighter add helpers when an id is enough.
The normalized add option names are `category`, `priority`, `postProcess`, `postProcessScript`, `name`, `password`, and `startPaused`.

##### `normalizedAddNzb(...)`

Add an NZB from either a URL or file content and return the created normalized queue item. This is the higher-level add helper when you want the normalized job back immediately.

##### Normalized state labels

`stateMessage` uses the shared `UsenetStateMessage` vocabulary:
`Grabbing`, `Queued`, `Downloading`, `Paused`, `Post-processing`, `Completed`, `Failed`, `Warning`, `Deleted`, and `Unknown`.

### Native API

NZBGet-specific methods are still available when you need the raw JSON-RPC surface.

Connection and discovery:

- `getVersion()` - wraps [`version`](https://nzbget-ng.github.io/api/version)
- `status()` - wraps [`status`](https://nzbget-ng.github.io/api/status)
- `listGroups()` - wraps [`listgroups`](https://nzbget-ng.github.io/api/listgroups)
- `history(hidden?)` - wraps [`history`](https://nzbget-ng.github.io/api/history)
- `getConfig()` - wraps [`config`](https://nzbget-ng.github.io/api/config)
- `configTemplates(loadFromDisk?)` - wraps [`configtemplates`](https://nzbget-ng.github.io/api/configtemplates)
- `listFiles(id)` - wraps [`listfiles`](https://nzbget-ng.github.io/api/listfiles)
- `getCategories()` - derived from [`config`](https://nzbget-ng.github.io/api/config)
- `getScripts()` - derived from [`configtemplates`](https://nzbget-ng.github.io/api/configtemplates)

Queue and rate control:

- `pauseDownload()` - wraps [`pausedownload`](https://nzbget-ng.github.io/api/pausedownload)
- `resumeDownload()` - wraps [`resumedownload`](https://nzbget-ng.github.io/api/resumedownload)
- `setRate(limitBytesPerSecond)` - wraps [`rate`](https://nzbget-ng.github.io/api/rate)
- `append(name, contentOrUrl, options?)` - wraps [`append`](https://nzbget-ng.github.io/api/append)
- `editQueue(command, parameter, ids)` - wraps [`editqueue`](https://nzbget-ng.github.io/api/editqueue)

### State Export

```ts
const state = client.exportState();
const restored = Nzbget.createFromState(config, state);
```

### Local Testing

Start a disposable NZBGet container on `localhost:6789` with the same credentials used by the client defaults:

```console
docker run -d --name nzbget-local-test \
  -p 6789:6789 \
  -e NZBGET_USER=nzbget \
  -e NZBGET_PASS=tegbzn6789 \
  lscr.io/linuxserver/nzbget:latest
```

Run the full local test suite against that container:

```console
TEST_NZBGET_URL=http://127.0.0.1:6789 TEST_NZBGET_USERNAME=nzbget TEST_NZBGET_PASSWORD=tegbzn6789 pnpm test
```

If you only want the container-backed integration spec:

```console
TEST_NZBGET_URL=http://127.0.0.1:6789 TEST_NZBGET_USERNAME=nzbget TEST_NZBGET_PASSWORD=tegbzn6789 pnpm test test/integration.spec.ts
```

Remove the disposable container when you are done:

```console
docker rm -f nzbget-local-test
```

### See Also

- shared types - [@ctrl/shared-usenet](https://github.com/scttcper/shared-usenet)
- torrent shared types - [@ctrl/shared-torrent](https://github.com/scttcper/shared-torrent)
- sabnzbd - [@ctrl/sabnzbd](https://github.com/scttcper/sabnzbd)
- deluge - [@ctrl/deluge](https://github.com/scttcper/deluge)
- transmission - [@ctrl/transmission](https://github.com/scttcper/transmission)
- qbittorrent - [@ctrl/qbittorrent](https://github.com/scttcper/qbittorrent)
- utorrent - [@ctrl/utorrent](https://github.com/scttcper/utorrent)
- rtorrent - [@ctrl/rtorrent](https://github.com/scttcper/rtorrent)
