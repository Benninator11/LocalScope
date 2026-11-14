# VRAMMatch – Local AI Model Finder

> **Kurzbeschreibung:** LocalScope enthält den VRAMMatch Local AI Model Finder: eine browserbasierte Entscheidungshilfe, die anhand von GPU, VRAM, Kontextlänge und Einsatzzweck passende lokale KI-Modellvarianten ermittelt. Für den Live-Katalog wird eine Internetverbindung benötigt.

Eine lokal ausführbare Webseite, die anhand von GPU, VRAM, Kontextlänge und Einsatzzweck passende lokale KI-Modelle empfiehlt.

## Start

1. ZIP entpacken.
2. `index.html` im Browser öffnen.
3. GPU auswählen oder VRAM manuell eintragen.
4. Der Modellkatalog verbindet sich beim Öffnen mit dem Ollama-Katalog und lädt echte Modell-Tags samt Quantisierungen.
5. Unter **KI-Modelle nach VRAM** kannst du nach Modell, Speicherpassung und Quantisierung filtern.
6. Mit **OLLAMA RUN KOPIEREN** den Startbefehl kopieren.

Die Oberfläche und GPU-Datenbank laufen lokal ohne Webserver. Für den Live-Modellkatalog ist eine Internetverbindung nötig. Nach erfolgreichem Laden speichert die Webseite mindestens 500 Varianten im Browser-Cache; die zwischengespeicherten Varianten bleiben auch offline sichtbar. Über **Katalog aktualisieren** kann die Liste manuell erneuert werden.

## Funktionen

- GPU-Suche und GPU-Datenbank aus der bereitgestellten `gpus_all.txt` (2.670 Einträge).
- VRAM-Stufen von 2 bis 256 GB mit Anzahl passender Modellvarianten pro Stufe.
- Automatische Empfehlungen nach Allround, Programmierung, Reasoning und Bildverständnis.
- Live-Katalog lokaler Ollama-Modelle mit mindestens 500 installierbaren Tags/Varianten, sofern der Online-Katalog erreichbar ist.
- Separate Auflistung unterschiedlicher Modellgrößen, Instruct-/Thinking-Ausgaben und Quantisierungen, zum Beispiel Q2, Q3, Q4, Q5, Q6, Q8, FP16/BF16, MXFP4 und NVFP4, sofern für den jeweiligen Modelltag verfügbar.
- Suche, VRAM-Passung, Quantisierungsfilter und Sortierung.
- Downloadgröße, geschätzter VRAM-Bedarf, Kontextfenster und `ollama run`-Befehl je Modell.
- Kennzeichnung **Passt**, **Knapp** oder **Zu groß**.

## Projektdateien

- `index.html` – Oberfläche
- `styles.css` – Design
- `app.js` – Auswahl, Katalogabruf, Filter und Berechnung
- `gpu-data-bundle.js` und `gpu-data-loader.js` – lokal eingebettete, gzip-komprimierte GPU-Datenbank (wird ohne zusätzlichen Serveraufruf entpackt)
- `ai-models.js` – kleiner Offline-Startkatalog; wird bei erfolgreichem Live-Abgleich durch den echten Ollama-Katalog ergänzt

## Daten und Grenzen

Der Live-Katalog verwendet die CORS-freundliche Ollama-Library-API von `ollama.kinduff.com`, die den aktuellen Ollama-Library-Index sowie die einzelnen Modell-Tags einschließlich Größe, Kontextfenster, Eingabetyp und Cloud-Status bereitstellt. Es werden nur lokale Modell-Tags mit hinterlegter Downloadgröße angezeigt; Cloud-Tags, `latest`-Aliase ohne eigene Gewichte und doppelte Tags mit identischem Digest werden nicht als zusätzliche Varianten gezählt.

**VRAM-Empfehlungen sind Schätzungen.** Die Webseite verwendet das echte Downloadgewicht plus einen Puffer für Laufzeit und Kontext. Der tatsächliche Bedarf hängt unter anderem von Quantisierung, Kontextlänge, KV-Cache, Backend, Bildauflösung, Treiber und parallel geöffneten Programmen ab. „Passt“ ist deshalb eine Orientierung und keine Garantie für einen erfolgreichen Start.

Datenquellen:

- Ollama Library: https://ollama.com/library
- Ollama Library API / tags: https://ollama.kinduff.com/
- Ollama API-Dokumentation: https://docs.ollama.com/api


## Animationen

Die Oberfläche verwendet kurze, dezente Bewegungen mit Laufzeiten zwischen 0,3 und 2,0 Sekunden: animierter Einstieg, sanft schwebender GPU-Chip, scrollbasierte Abschnitts-Einblendungen, gestaffeltes Erscheinen von Empfehlungen und Modellkarten sowie Lichtreflexe beim Darüberfahren. Bei aktivierter Betriebssystem-Einstellung „Bewegung reduzieren“ werden die Animationen abgeschaltet.


## Hinweis zur Datenbank

Die GPU-Datenbank wird im Repository als gzip-komprimiertes JavaScript-Bundle gespeichert, damit der umfangreiche Datensatz nicht unnötig viel Repository-Speicher belegt. `gpu-data-loader.js` entpackt den Datensatz direkt im Browser. Dafür wird ein aktueller Browser mit `DecompressionStream` benötigt. Es wird keine zusätzliche Datenbank-Datei aus dem Internet geladen.