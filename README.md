# Diabétesz napló

Első, telefonra optimalizált prototípus személyes vércukor- és inzulinnaplózáshoz.

## Használat

- Az `index.html` megnyitható közvetlenül prototípus kipróbálásához.
- A telepíthető webalkalmazáshoz (PWA) HTTPS-en vagy localhoston kell kiszolgálni. Ilyenkor a böngésző menüjében az **Add to Home Screen / Hozzáadás a főképernyőhöz** művelettel lehet telepíteni.
- Egyszerű helyi kiszolgálóhoz: `python3 -m http.server 8000`, majd `http://localhost:8000`.

## Mi működik

- Havi naptár, hónapváltás és napi részletek
- Vércukor (mmol/L vagy mg/dL), inzulin napszak/mennyiség és szabad megjegyzés rögzítése
- A profilban a nappali és éjjeli inzulin neve, valamint a napi alkalmak száma állítható
- Dátumtartományos vércukor-jelentés napi és heti átlagokkal, nyomtatásból PDF-be menthető formában
- Profil: életkor, magasság, testsúly, diabétesz típusa, inzulinok és napi alkalmak
- Mobilnézet és főképernyőre telepíthető PWA alapok
- Napló és profil mentése a böngésző helyi tárhelyére

## Fontos állapot

Ez még helyi prototípus, nem valódi fiókos szolgáltatás. Az emailes regisztráció és visszaigazolás, több eszköz közti szinkronizálás és felhasználónkénti hozzáférés szerveroldali hitelesítést és adatbázist igényel. A jelenlegi verzió nem küld adatot szerverre. A böngésző helyi tárhelyét más felhasználók ugyanazon az eszközön elérhetik, ezért közös vagy nyilvános eszközön ne használj valódi egészségügyi adatokat.

A felület naplózásra szolgál, nem ad diagnózist vagy adagolási javaslatot.
