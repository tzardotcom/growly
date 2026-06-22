# Growly — Landing Page (Fake-door MVP)

**Produkcja:** https://getgrowly.pl

Statyczny landing page testujący zainteresowanie **Growly Starter Boxem** (G-001 + G-002 z `backlog.md`).

Cel: ciepła, emocjonalna narracja + konkret produktu, która **konwertuje na zapis e-mail**. Box (formularz rezerwacji) można otworzyć z **każdej sekcji strony** oraz z pasków sticky, floating CTA i exit-intent.

## Pliki

| Plik | Co zawiera |
|------|------------|
| `index.html` | Struktura i copy wszystkich sekcji |
| `styles.css` | Design system (kolory, typografia, layout, modal, responsywność) |
| `script.js` | Fake-door flow, pętle marketingowe, eventy analityczne |
| `assets/` | Grafiki (hero, ogród, Starter Box, Ciocia Joanna) |

## Jak uruchomić lokalnie

To zwykły statyczny HTML — wystarczy serwer plików:

```bash
cd growly
python3 -m http.server 4321
# otwórz http://localhost:4321
```

## Hooki sprzedażowe i pętle (ukryte, ale obecne)

- **Dowód społeczny** — licznik osób na liście oczekujących (bazowo 120).
- **Awersja do straty** — sekcja problemu („Ja nawet kaktusa bym zasuszył").
- **Anchoring / kontrast** — porównanie market vs Growly Box.
- **Autorytet / zaufanie** — Ciocia Joanna, sekcja logistyki żywych roślin.
- **Reciprocity + brak ryzyka** — „rezerwujesz teraz, płacisz później".
- **Commitment** — pytanie badawcze po zapisie (krok 2 modala).
- **Pętla referralowa** — po zapisie: „poleć znajomemu, przeskocz wyżej w kolejce" (WhatsApp / FB / kopiuj link).
- **Exit intent** — modal ratujący przy próbie wyjścia.
- **CTA wszędzie** — każdy przycisk `.js-open-box` otwiera ten sam fake-door box.

## Fake-door flow (modal)

1. **Krok 1** — zapis e-mail.
2. **Krok 2** — pytanie badawcze: „Co najbardziej powstrzymuje Cię przed posiadaniem roślin?".
3. **Krok 3** — pozycja w kolejce + pętla referralowa.

## Analityka (G-004)

`script.js` wysyła eventy do `window.dataLayer` (GTM) i `gtag` jeśli są, oraz loguje do konsoli:

- `lp_view`
- `cta_click_starter_box` (z `source` = z której sekcji)
- `email_submitted`
- `post_signup_question_answered`
- `exit_intent_shown`, `referral_shared` (dodatkowe)

## Zapis e-mail → Supabase + mail powitalny (Resend)

Formularz wysyła `POST { email, reason, source, website }` do **Supabase Edge Function** `growly-signup`,
która: zapisuje leada do `growly.leads`, a następnie wysyła **powitalny e-mail przez Resend**
(raz na adres). Sekrety (`RESEND_API_KEY`, service-role key) zostają **po stronie serwera** —
nie ma ich w tej statycznej stronie.

- Endpoint domyślny: `https://xxlnwijfmuwahvtvkxge.supabase.co/functions/v1/growly-signup`
- Nadpisanie (np. inny projekt): dodaj **przed** `script.js`:
  ```html
  <script>window.GROWLY_SIGNUP_URL = 'https://<ref>.supabase.co/functions/v1/growly-signup';</script>
  ```

### Co trzeba ustawić raz (po stronie Supabase)

1. **Migracja** `supabase/migrations/20260621214150_growly_waitlist.sql` (`supabase db push`) — tworzy
   schemat `growly`, tabele i RLS.
2. **Deploy funkcji**: `supabase functions deploy growly-signup`.
3. **Sekrety funkcji** (`supabase secrets set ...`):
   - `RESEND_API_KEY` — klucz Resend,
   - `GROWLY_EMAIL_FROM` — np. `Growly <hello@getgrowly.pl>` (domena zweryfikowana w Resend),
   - `GROWLY_ALLOWED_ORIGINS` — (opcjonalnie) lista origin-ów LP po przecinku; brak = `*`,
   - `GROWLY_IP_SALT` — (opcjonalnie) sól do hashowania IP.
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` są wstrzykiwane automatycznie.

### Zabezpieczenia endpointu (publiczny formularz)

- **Honeypot** (ukryte pole `website`) — odsiewa boty.
- **Dedup** — jeden powitalny mail na adres (brak email-bombingu tego samego adresu).
- **Rate limit per IP** — maks. 15 zapisów/godz. z jednego IP.
- **IP tylko jako hash** (SHA-256 + sól) — mniej PII w bazie.
- **Odpowiedzi neutralne** — endpoint nie zdradza, czy adres już był na liście (brak enumeracji).

## Deploy

Statyczny katalog — gotowy do hostingu (Vercel / Netlify / dowolny static host). W Vercel: ustaw katalog `growly/` jako root projektu (framework: „Other", bez buildu).

## Granice MVP (świadomie poza zakresem)

Brak płatności, sklepu, subskrypcji, AI i integracji z Allegro/InPost — zgodnie z `scope.md` i `DECISIONS.md` (D-001…D-003). Kierunki przyszłe pokazane są wyłącznie jako wizja („Wkrótce"), bez obietnicy dostępności teraz.
