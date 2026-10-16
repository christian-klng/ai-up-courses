# AI-Up Kurse

Lern- und Prüfungs-App für Communities: Kurse als Strecke aus **Anforderungen**, erfüllt über frei
wählbare **Nachweise**, bewertet von deterministischen, KI- oder menschlichen **Juroren**, geführt von
einem **KI-Lotsen** in den Grenzen des Admins. Konzept: [`PLAN.md`](PLAN.md).

Läuft eigenständig unter `kurse.ai-up.club` und übernimmt von [AI-Up](https://github.com/christian-klng/ai-up)
vorerst nur das Design ([`DESIGN.md`](DESIGN.md)).

## Stand

| Phase | Status |
|---|---|
| **0 – Gerüst** | umgesetzt: Next.js 16, Design aus AI-Up, Better Auth (Magic Link), Communities mit Beitrittslink, Theme je Community, Betreiber-Seite, Worker, Docker-Images per GitHub Actions. Offen: DNS + Coolify-Ressource ([`docs/deployment.md`](docs/deployment.md)) |
| A – Grundgerüst Lernen | – |
| B – KI-Juroren | – (vorher rechtliche Einschätzung, PLAN.md §10) |
| C – Lotse und Zertifikate | – |
| D – Eigene Erlebnisse | – |
| E – AR | – |

## Lokal starten

```bash
docker compose -f docker-compose.dev.yml up -d
cp .env.example .env.local   # OPERATOR_EMAILS und Secrets anpassen
npm install
npm run db:migrate
npm run dev                  # http://localhost:3100
npm run worker               # zweites Terminal
```

Anmeldelinks landen in Mailpit: http://localhost:8026. Als Betreiber legst du unter `/operator`
Communities mit ihrer ersten Admin-Person an; Mitglieder kommen über den Beitrittslink
(*Einstellungen → Beitrittslink*) dazu.

Prüfen: `npm run typecheck && npm run lint && npm test && npm run build`.
