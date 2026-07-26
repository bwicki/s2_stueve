// Stüve Diagramm Tool — kleiner Speicher-Endpunkt für "Create link"
//
// Was das ist: ein winziges, kostenloses Cloudflare Worker Skript, das
// Flugdaten unter einer kurzen ID speichert und wieder ausliefert, damit
// der "Create link"-Button im Stüve-Tool kurze Links mit dem VOLLEN
// Datensatz erzeugen kann (statt eines langen Links mit ausgedünnten Daten).
//
// Einmalige Einrichtung durch dich (ca. 10 Minuten), danach funktioniert
// die Funktion für JEDEN, der eure gehostete Seite benutzt — ohne eigenes
// Konto, ohne Token, ohne irgendein Setup auf deren Seite.
//
// ---------------------------------------------------------------------
// EINRICHTUNG (Stand: aktuelle Cloudflare-Oberfläche)
// ---------------------------------------------------------------------
// 1. Auf https://dash.cloudflare.com kostenlos registrieren (keine
//    Kreditkarte nötig für den Free-Plan).
// 2. Im Menü links: "Workers & Pages" → "Create".
// 3. Es erscheinen mehrere Kacheln: "Connect GitHub", "Connect GitLab",
//    "Start with Hello World!", "Select a Template", "Upload your static
//    files". Du willst die Kachel "Start with Hello World!" → "Get started".
// 4. Einen Namen vergeben, z.B. "stueve-flights" → "Deploy" klicken.
//    (Das deployt zunächst den Beispiel-Code — das ist normal.)
// 5. Nach dem Deploy auf "Edit code" (bzw. "Continue to project" → dort
//    den Code-Editor öffnen) klicken.
// 6. Den GESAMTEN Beispielcode im Editor markieren, löschen, und
//    stattdessen den GESAMTEN Code weiter unten in dieser Datei einfügen.
// 7. Rechts oben "Deploy" (bzw. "Save and deploy") klicken.
// 8. Jetzt die KV-Datenbank anlegen und verbinden:
//    a) Im Worker auf "Settings" → "Bindings" → "Add" klicken.
//    b) "KV Namespace" auswählen.
//    c) Variable name: FLIGHTS  (genau so schreiben, Grossbuchstaben)
//    d) Bei "KV namespace": "Create new" wählen, einen Namen vergeben
//       (z.B. "stueve-flights-kv"), erstellen.
//    e) Speichern / Deploy — je nach Oberfläche nochmals "Deploy" nötig,
//       damit die Bindung aktiv wird.
// 9. Oben auf der Worker-Übersichtsseite steht die Worker-URL, z.B.:
//    https://stueve-flights.DEIN-SUBDOMAIN.workers.dev
//    Diese URL kopieren.
// 10. In der Datei Stueve_Diagramm_Tool.html nach
//     "const STORAGE_ENDPOINT = '';" suchen und die URL einfügen:
//     const STORAGE_ENDPOINT = 'https://stueve-flights.dein-name.workers.dev';
//
// Kurzer Test danach: Im Worker-Dashboard unter "Logs" (falls vorhanden)
// oder einfach im Stüve-Tool selbst "Create link" klicken — wenn eine
// kurze URL mit "?flight=" erscheint statt der langen "#d="-Variante,
// funktioniert alles.
// ---------------------------------------------------------------------

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    const url = new URL(request.url);

    if (request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return new Response(JSON.stringify({ error: 'invalid JSON body' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      if (!body || typeof body.c !== 'string') {
        return new Response(JSON.stringify({ error: 'missing "c" field' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      // short, URL-safe random id
      const id = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
      // keep flights for 6 months of inactivity
      await env.FLIGHTS.put(id, JSON.stringify({ c: body.c }), {
        expirationTtl: 60 * 60 * 24 * 180,
      });
      return new Response(JSON.stringify({ id }), {
        status: 201,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    if (request.method === 'GET') {
      const id = url.searchParams.get('id');
      if (!id) {
        return new Response(JSON.stringify({ error: 'missing id parameter' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      const stored = await env.FLIGHTS.get(id);
      if (!stored) {
        return new Response(JSON.stringify({ error: 'not found or expired' }), {
          status: 404,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      return new Response(stored, {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'method not allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  },
};
