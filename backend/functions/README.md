# Backend Functions Hinweis

Für den Button **Account löschen** wird eine Supabase Edge Function `delete-account` erwartet:

- Pfad: `backend/functions/delete-account/index.ts`
- Muss mit Service Role Key den aktuell authentifizierten User löschen.
- Frontend ruft die Funktion über `supabase.functions.invoke("delete-account")` auf.

Ohne diese Function zeigt das Frontend einen Hinweis an, dass Integration erforderlich ist.
