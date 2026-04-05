# AGENTS

## flutter_dev_agent
Erstellt präzise Implementierungs-Prompts pro Task aus Task-Graph und Product-Spec.

## fixer_agent
Erstellt Fix-Prompts aus `flutter analyze`/`flutter test` Ausgaben und dem aktuellen Task.

## codex_runner
Läuft in V1 standardmäßig im Mock-Modus:
- protokolliert Prompts je Task in `apps/project/.mini_autoflutter_codex.log`
- liefert strukturierte Rückgabe (`success`, `message`)
- ist als austauschbarer Adapter für eine spätere echte API gebaut
