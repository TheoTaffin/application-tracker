# Application Tracker

Track job applications during a job search in Switzerland: the offer, what I wrote in the
application form, the resume I sent, my contacts, and every status change until the outcome.

## Features

- **Applications** with company, role, location, workload (e.g. 80–100%), salary ask (CHF),
  posting language, source, form answers and next action.
- **Status history**: every update is a dated event. The current status is the latest event,
  grouped as _Pending_, _On-going_ or _Closed_.
- **Resume library**: reuse a resume across applications or upload a new one. Other files
  (cover letters, screenshots…) attach to a single application.
- **Contacts** shared across applications.
- **Dashboard**: status groups with their detailed breakdown, follow-ups due in the next 48 hours,
  a filterable and sortable table, and a side panel with the selected application's history.
- **Save-to-tracker bookmarklet**: one click on any job posting opens the tracker in a new tab
  with the offer already fetched. Clicked on an application form before submitting, it also
  brings the answers typed so far and the salary asked for (read in the browser, never fetched).
- **Offer extraction**: paste a URL and the fields are prefilled. Supports jobs.ch, jobup.ch,
  LinkedIn and any site publishing a schema.org `JobPosting`, with a readable-text fallback.
  A plain-text snapshot is kept because postings disappear.

## Architecture

```mermaid
flowchart LR
  browser([Browser]) -->|127.0.0.1:3000| web
  subgraph compose [docker compose]
    web[web<br/>Next.js standalone] --> db[(db<br/>PostgreSQL 18)]
    web --> storage[(storage<br/>RustFS, S3 API)]
    init[init<br/>migrations + bucket] -.-> db
    init -.-> storage
  end
  web -->|egress only| internet((Job sites))
```

- **Next.js 16** (App Router, Server Actions, Cache Components), **TypeScript**, **Drizzle ORM**,
  **zod** validation, **Tailwind CSS 4**. Pages are partially prerendered: the shell is static and
  data streams in per request inside `<Suspense>`.
- **PostgreSQL** for data; **S3-compatible object storage** for files ([RustFS](https://rustfs.com)
  locally, any S3 provider in production by changing env vars).
- Data lives only in named Docker volumes. The database and storage sit on an internal network
  with no internet access and no published ports.

### Code layout

```
src/lib/                    shared, client-safe: status model, enums, validation schemas
src/server/                 server-only (`import "server-only"`)
  env.ts                    the only reader of process.env, validated with zod
  db/                       Drizzle schema and client
  repositories/             queries, no business rules
  services/                 business rules, transactions, DTOs (no storage keys leak out)
  actions/                  Server Actions: the UI's entry points, typed ActionResult
  storage/s3.ts             object storage
  extraction/               offer extraction (SSRF-safe fetch, extractors, registry)
src/app/api/                files/[id] (download proxy), health
drizzle/                    SQL migrations
scripts/init.mts            migrations + bucket creation (one-shot container)
tests/unit, tests/integration
```

### Security notes

- No authentication yet (localhost only), but every entry point goes through the action and
  service layers, so adding it is one check plus an owner column.
- Files are never exposed from the bucket: `/api/files/[id]` streams them with `nosniff`, a
  sandboxing CSP and inline display only for PDF/images. Uploads are type-checked from their
  bytes, size-limited and stored under random keys.
- Offer extraction fetches arbitrary URLs, so it blocks private, loopback, link-local and
  metadata addresses at connect time (no DNS-rebinding window), follows redirects manually,
  and caps time and size.

## Getting started

Requirements: Docker, [uv](https://docs.astral.sh/uv/), Node 24 (`nvm use`), make.

```bash
make setup   # tooling + git hooks (pre-commit, Conventional Commits)
make env     # .env with generated secrets
make up      # build and start, then open http://127.0.0.1:3000
```

### Development

```bash
make dev                # db + storage in Docker, published on 127.0.0.1 only
make seed               # optional: fictional demo data, only into an empty database
npm run dev             # Next.js on http://127.0.0.1:3000 (loopback only), reads .env
make test               # unit tests
make test-integration   # services against real Postgres + storage (isolated test db/bucket)
make lint               # every pre-commit check on the whole repo
make db-generate        # new migration after a schema change
```

### Debug tools

```bash
make tools   # Adminer on 127.0.0.1:8080, storage console on 127.0.0.1:9001/rustfs/console/
```

Opt-in through a Compose profile and bound to loopback, so a plain `make up` exposes nothing
but the app.

### Backups

`make backup` writes a `pg_dump` and an archive of the stored files to `./backups/`
(gitignored). `make restore DB=backups/db-<ts>.dump FILES=backups/files-<ts>.tar.gz` puts one
back: it replaces the database and the stored files, applies newer migrations and restarts the
app if it was running. Backups move between machines (the stack's passwords may differ), e.g.
to load local data onto the Pi: copy both files to `~/application-tracker/backups/` there and
run `scripts/restore.sh` with them.

## Deployment

Every push to `main` deploys to a Raspberry Pi at home, once CI has passed on it
(`.github/workflows/cd.yml`):

1. **publish** builds the `runner` and `init` images on a native arm64 runner and pushes them to
   GHCR, tagged with the commit SHA (and `latest`).
2. **deploy** joins the tailnet as a temporary `tag:ci` node, uploads `compose.yaml` and the
   scripts over SSH, then runs [`scripts/entrypoint.sh`](scripts/entrypoint.sh) one stage per step:
   pull → backup → migrate → up → health check → prune (service logs on failure). Images are
   pulled with the job's own token, which expires with the job.

The Pi is never reachable from the internet: Tailscale only makes outbound connections, and the
tailnet policy lets the CI node reach SSH on the Pi and nothing else.

### One-time setup

**Raspberry Pi** (64-bit Raspberry Pi OS, `uname -m` prints `aarch64`):

1. Install Docker with the Compose plugin, and Tailscale: `sudo tailscale up --advertise-tags=tag:pi`.
2. Create a `deploy` user in the `docker` group (root-equivalent, so the key below is used by
   the CD only) and add the CD's public key to its `~/.ssh/authorized_keys`.
3. Write `~deploy/application-tracker/.env` from `.env.example` with fresh secrets
   (`openssl rand -hex 24`); the host-side development variables are not needed.
4. A Pi 3 has 1 GB of RAM: give it about 1 GB of swap.

**Tailscale** (admin console):

- Access controls: own both tags and limit the CI node to SSH on the Pi.
  ```json
  "tagOwners": { "tag:ci": ["autogroup:admin"], "tag:pi": ["autogroup:admin"] },
  "grants": [
    { "src": ["autogroup:member"], "dst": ["*"], "ip": ["*"] },
    { "src": ["tag:ci"], "dst": ["tag:pi"], "ip": ["tcp:22"] }
  ]
  ```
- Trust credentials → OpenID Connect (GitHub), subject
  `repo:TheoTaffin@46529237/application-tracker@1421061444:environment:raspberry-pi` (GitHub
  puts the owner and repository IDs in the subject, so a renamed or re-created repository
  doesn't match), writable `auth_keys` scope, tag `tag:ci`. No Tailscale secret is stored in
  GitHub.

**GitHub** (Settings → Environments → `raspberry-pi`, deployment branches: `main` only):

| Name                 | Kind     | Value                                                  |
| -------------------- | -------- | ------------------------------------------------------ |
| `DEPLOY_HOST`        | variable | the Pi's MagicDNS name                                 |
| `DEPLOY_USER`        | variable | `deploy`                                               |
| `TS_OAUTH_CLIENT_ID` | variable | client ID of the trust credential                      |
| `TS_AUDIENCE`        | variable | audience of the trust credential                       |
| `DEPLOY_SSH_KEY`     | secret   | private key of a key pair made for the CD only         |
| `DEPLOY_KNOWN_HOSTS` | secret   | `ssh-keyscan <DEPLOY_HOST>`, run from a tailnet device |

### Operating

- **Open the app** from your own devices: `sudo tailscale serve --bg 3000` on the Pi serves it
  over HTTPS on the tailnet only. Never use Funnel: the app has no authentication yet.
- **Status and logs** on the Pi: `~/application-tracker/scripts/entrypoint.sh compose ps` (or `logs`,
  any `docker compose` command, on the deployed images).
- **Deploy by hand** on the Pi: `~/application-tracker/scripts/entrypoint.sh deploy <sha>` runs
  every stage in order and stops at the first that fails. Without a `[user]` (and a token on
  stdin) it pulls anonymously, which needs the GHCR packages to be public.
- **Roll back** by re-running the deploy job of an earlier workflow run: its images are still in
  GHCR. Migrations only go forward, so if the schema changed, also restore the backup taken
  just before (`scripts/restore.sh` with the files from `~/application-tracker/backups/`).
- **Another server** reachable over SSH: a new environment with its own variables and secrets.

### Future work

- Deploy on releases instead of every merge (e.g. release-please from the Conventional Commits).
- Copy backups off the Pi: they live on the same SD card as the data.
- Authentication, before the app is reachable by anyone but me.

## Contributing

Work happens on branches through pull requests: `main` is protected and requires the `lint` and
`conventional-commits` checks. Commit messages and PR titles follow
[Conventional Commits](https://www.conventionalcommits.org).

`make help` lists every command.
