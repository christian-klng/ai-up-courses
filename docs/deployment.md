# Deployment (Coolify, `kurse.ai-up.club`)

Siehe PLAN.md §3.5. Kurz: GitHub Actions baut bei jedem Push auf `main` zwei Images aus
`docker/Dockerfile` (Targets `web` und `worker`), schiebt sie nach
`ghcr.io/christian-klng/ai-up-courses:{web,worker}-latest` (plus `-<sha>`) und löst danach den
Coolify-Deploy aus. Der App-VPS baut nie selbst.

## Einmalig einrichten

1. **DNS bei IONOS:** `kurse.ai-up.club` → A-Record auf den App-VPS, AAAA mit `::1` (nicht `::`).
2. **GHCR-Paket öffentlich:** Nach dem ersten erfolgreichen Workflow-Lauf unter
   *GitHub → Packages → ai-up-courses → Package settings* die Sichtbarkeit prüfen und auf *Public*
   stellen, falls es nicht automatisch der Repo-Sichtbarkeit folgt. Dann zieht Coolify ohne Zugangsdaten.
3. **Coolify:** neue Ressource *Docker Compose* `ai-up-courses` aus diesem Repo (`docker-compose.yml`).
   Domain für Service `web` **ohne** `https://` eintragen: `kurse.ai-up.club`, Port 3000.
4. **Variablen in Coolify** (leere Werte filtert `src/server/env.ts` heraus):

   | Variable | Wert |
   |---|---|
   | `APP_URL` | `https://kurse.ai-up.club` |
   | `OPERATOR_EMAILS` | Betreiber-Adresse(n), kommagetrennt |
   | `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
   | `APP_ENCRYPTION_KEY` | `openssl rand -base64 32` (nie mehr ändern: verschlüsselt später LLM-Schlüssel) |
   | `POSTGRES_PASSWORD` | zufällig |
   | `SMTP_USER`, `SMTP_PASS` | IONOS-Zugang von AI-Up (`noreply@ai-up.club`) |

   `SMTP_HOST` (`smtp.ionos.de`), `SMTP_PORT` (587), `SMTP_SECURE` (false) und `SMTP_FROM` haben
   passende Standardwerte in `docker-compose.yml`.
5. **Deploy-Webhook:** In Coolify unter der Ressource den Deploy-Webhook kopieren und einen API-Token
   anlegen. Beides als GitHub-Secrets hinterlegen: `COOLIFY_WEBHOOK_URL` und `COOLIFY_TOKEN`. Fehlen
   sie, pusht der Workflow die Images trotzdem und überspringt nur den Deploy (Warnung im Lauf).

## Ablauf eines Deploys

`web` startet mit `docker/entrypoint.sh web`: zuerst `node dist/migrate.js` (Migrationen + Seed der
Betreiber-Konten), dann der Next.js-Server. `worker` startet erst, wenn `web` gesund ist
(`/api/health` prüft Datenbank, Redis und Upload-Volume).

## Öffentliches Repo

Vor jedem Push prüfen, dass keine Zugangsdaten im Repo landen. `.env.local` und alle `.env.*` außer
`.env.example` stehen in `.gitignore`.
