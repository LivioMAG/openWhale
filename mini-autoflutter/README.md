# Mini-Autoflutter (V1)

Mini-Autoflutter ist ein minimalistischer Orchestrator für Flutter-Entwicklung.
Er liest eine Produktspezifikation, plant Tasks, führt pro Task einen (mocked) Coding-Agent-Lauf aus,
startet `flutter analyze` und `flutter test`, versucht bei Fehlern automatische Fix-Runden,
und persistiert den Fortschritt in `state.json`.

## Architekturüberblick

Das Repository ist strikt in Schichten getrennt:

- `orchestrator/`: Ablaufsteuerung (`engine`, `planner`, `scheduler`, `state_manager`, `main`)
- `agents/`: Prompt-Erzeugung für Entwicklung und Fehlerbehebung
- `execution/`: Adapter für Codex-Run (Mock) und Shell-Kommandos
- `specs/`: Produkt-Spec, Task-Graph und Zustand
- `configs/`: Framework-Konfiguration
- `apps/`: Ziel-Flutter-Projektpfad

## Startanleitung

1. Python-Umgebung mit Python 3.11 vorbereiten.
2. Abhängigkeiten installieren:

   ```bash
   pip install -r requirements.txt
   ```

3. Orchestrator starten:

   ```bash
   python -m orchestrator.main
   ```

4. Ergebnis prüfen:
   - `specs/project/task_graph.yaml` wird erzeugt/aktualisiert, falls leer oder fehlend.
   - `specs/project/state.json` wird erzeugt/aktualisiert.
   - Pro Lauf wird genau ein nächster Task verarbeitet.

## Grenzen von V1

- Keine Parallelisierung, nur sequenzielle Task-Ausführung.
- `CodexRunner` ist absichtlich ein Mock-Adapter ohne echte API-Verbindung.
- Flutter-Befehle werden direkt auf dem Host ausgeführt; wenn Flutter nicht installiert ist,
  schlägt die Qualitätsprüfung erwartbar fehl und wird im State dokumentiert.
- Fokus ist Orchestrierungslogik, nicht vollständige Flutter-Codegenerierung.
