# 5.x Vorlagen-Konzept (Post & Carousel)

## 5.1 Allgemeines Konzept für Vorlagen

Für Vorlagen existiert ein eigener Datensatz in `public.content_templates`.
Jede Vorlage besitzt eine eigene `id` und beschreibt alle Inhalte, die für die spätere Beitragserstellung benötigt werden.

### Kernfelder

- `id`
- `template_type` (`post` oder `carousel`)
- `caption_requirements`
- `hashtag_requirements`
- `image_editing_template_id` (Verweis auf `public.image_editings.id`)
- `carousel_structure` (JSONB, nur für Carousel)
- `caption_prompt` und `hashtag_prompt` (werden im Hintergrund gesetzt)
- `webhook_status` (`pending`, `sent`, `failed`)

### Grundidee

Der User beschreibt:

1. was in den Captions stehen soll
2. wie die Hashtags ausgerichtet sind
3. welche Bildbearbeitungsvorlage verwendet wird

Nach Abschluss wird ein Webhook ausgelöst. Danach werden im Hintergrund automatisch erzeugt:

- Caption Prompt
- Hashtag Prompt

---

## 5.2 Vorlage Typ „Post“

Der Typ `post` enthält mindestens folgende Logik:

1. User erstellt eine Post-Vorlage
2. User beschreibt Caption-Anforderungen
3. User beschreibt Hashtag-Ausrichtung
4. User wählt eine passende Bildbearbeitungsvorlage
5. User klickt auf „Fertig“

### Datenregeln für `post`

- `caption_requirements` ist Pflicht
- `hashtag_requirements` ist Pflicht
- `image_editing_template_id` ist Pflicht
- `carousel_structure` bleibt `NULL`

Nach dem Abschluss wird wie beim bestehenden Prozess ein Webhook gesendet und die Prompt-Erzeugung im Hintergrund angestoßen.

---

## 5.3 Vorlage Typ „Carousel“

Der Typ `carousel` funktioniert wie `post`, hat aber zusätzlich eine strukturierte Reihenfolge von Teilvorlagen.

### Zusätzliche Besonderheit

`carousel_structure` ist ein JSONB-Feld mit einer **List of Maps**. Beispiel:

```json
[
  { "position": 1, "template_id": 10 },
  { "position": 2, "template_id": 12 },
  { "position": 3, "template_id": 7 },
  { "position": 4, "template_id": 10 },
  { "position": 5, "template_id": 3 }
]
```

Damit kann der User die Reihenfolge innerhalb eines Carousels definieren (Position 1 bis n).

### Ablauf

1. User erstellt Carousel-Vorlage
2. User definiert Caption- und Hashtag-Richtung
3. User fügt mehrere Vorlagenbausteine hinzu
4. User ordnet diese per Ranking/Reihenfolge
5. Nach Fertigstellung werden Prompts im Hintergrund erzeugt

Der Gesamtprozess entspricht ansonsten dem Post-Ablauf.
