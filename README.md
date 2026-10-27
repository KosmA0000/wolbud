# WOL-BUD

Aktualna statyczna strona WOL-BUD: oferta, realizacje, kontakt i animacja budowy domu sterowana przewijaniem.

Strona: https://kosma0000.github.io/wolbud/

## Podgląd lokalny

W katalogu repozytorium uruchom:

```sh
python -m http.server 8765 --bind 127.0.0.1 --directory public
```

Otwórz http://127.0.0.1:8765/.

## Publikacja

Pliki strony znajdują się w `public/`. Zmiany wysłane na gałąź `main` są automatycznie publikowane przez GitHub Actions i GitHub Pages.
Projekt nie wymaga instalowania zależności ani kompilacji.

Na stronie głównej są trzy kategorie realizacji: Okna, Bramy i Drzwi.
Podstrona `/realizacje/` zawiera 41 zdjęć, filtry, animacje wejścia i interaktywny podgląd zdjęć.
