// lib/icsParser.js
// Parser ICS volutamente minimale: estrae solo i campi che servono
// (SUMMARY, DESCRIPTION, DTSTART) da un feed .ics testuale, senza
// dipendenze esterne.

export function parseIcsEvents(icsText) {
  const events = [];
  const blocks = icsText.split("BEGIN:VEVENT").slice(1);

  for (const block of blocks) {
    const body = block.split("END:VEVENT")[0];
    const summary = extractField(body, "SUMMARY");
    const description = extractField(body, "DESCRIPTION");
    const dtstart = extractField(body, "DTSTART");

    events.push({
      summary: unescapeIcsText(summary),
      description: unescapeIcsText(description),
      dtstart,
    });
  }

  return events;
}

function extractField(block, field) {
  // Gestisce anche varianti con parametri, es. "DTSTART;TZID=Europe/Rome:20260910T090000"
  const regex = new RegExp(`${field}(?:;[^:\\n]*)?:(.*)`, "i");
  const match = block.match(regex);
  return match ? match[1].trim() : "";
}

function unescapeIcsText(text) {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";");
}
