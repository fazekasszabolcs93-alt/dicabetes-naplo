# Diabétesz napló

Telefonra optimalizált, telepíthető webalkalmazás vércukor- és inzulinbejegyzésekhez.

## Mi működik

- Havi naptár és napi bejegyzések
- Vércukor rögzítése mmol/L vagy mg/dL mértékegységben
- Nappali és éjjeli inzulin, mennyiség és megjegyzés rögzítése
- Egészségügyi profil és időszakos, napi/heti átlagokat tartalmazó PDF-jelentés
- E-mailes fiók létrehozás és bejelentkezés Supabase Auth segítségével
- Profil és naplóbejegyzések mentése Supabase adatbázisba
- Mobilnézet és PWA telepíthetőségi alapok

## Helyi indítás

Az `index.html` helyett indíts helyi HTTP-kiszolgálót, mert a bejelentkezés és a Service Worker HTTPS-en vagy localhoston működik:

```sh
python3 -m http.server 8000
```

Ezután nyisd meg a `http://localhost:8000` címet.

## Supabase

- A böngésző beállításai a `supabase-config.js` fájlban vannak. A benne lévő Publishable key nyilvános használatra készült; Secret vagy service_role kulcs nem kerülhet ide.
- A `supabase/schema.sql` állítja be a táblákat és a felhasználónkénti Row Level Security (RLS) szabályokat.
- A Supabase Auth URL Configuration Site URL és Redirect URL értéke: `https://diabetes-journal.pages.dev`.
- A Data API-nak engedélyezve kell lennie, és a `public` sémának elérhetőnek kell lennie. Az adatbázis táblái csak az `authenticated` szerepkörnek kapnak jogosultságot; RLS-szabályok csak a saját felhasználói azonosítóhoz tartozó sorokat engedik.
- A Supabase alapértelmezett e-mail-küldője korlátozott. Külső címre történő regisztrációs megerősítéshez saját SMTP-szolgáltatót kell beállítani.

## Adatvédelem

A weboldal naplóit kizárólag bejelentkezett felhasználók tölthetik be. A Supabase RLS szabályai minden adatbázis-műveletnél ellenőrzik a fiókazonosságot. A Publishable key önmagában nem ad hozzáférést a naplóbejegyzésekhez.

A korábban a böngészőben mentett helyi adatok nem töltődnek fel automatikusan. A felület naplózásra szolgál, nem ad diagnózist vagy adagolási javaslatot.
