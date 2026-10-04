// lib/emailParser.js
// Estrae numero/i di volo e data dal testo di un'email di conferma
// prenotazione. Copre i pattern più comuni; non è perfetto per ogni
// compagnia/OTA, ma gestisce bene i casi standard.

const FLIGHT_NUMBER_REGEX = /\b([A-Z]{2}\d{1,4}|[A-Z]{3}\d{1,4})\b/g;

const MONTHS_IT = {
  gennaio: "01", febbraio: "02", marzo: "03", aprile: "04",
  maggio: "05", giugno: "06", luglio: "07", agosto: "08",
  settembre: "09", ottobre: "10", novembre: "11", dicembre: "12",
};

const MONTHS_EN = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

/**
 * Cerca date in formato "12 settembre 2026", "12 Sep 2026" o "2026-09-12".
 * Ritorna un array di stringhe "YYYY-MM-DD".
 */
function extractDates(text) {
  const dates = new Set();

  // ISO: 2026-09-12
  for (const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    dates.add(`${m[1]}-${m[2]}-${m[3]}`);
  }

  // "12 settembre 2026"
  const monthNamesIt = Object.keys(MONTHS_IT).join("|");
  const reIt = new RegExp(`\\b(\\d{1,2})\\s+(${monthNamesIt})\\s+(\\d{4})\\b`, "gi");
  for (const m of text.matchAll(reIt)) {
    const day = m[1].padStart(2, "0");
    const month = MONTHS_IT[m[2].toLowerCase()];
    dates.add(`${m[3]}-${month}-${day}`);
  }

  // "12 Sep 2026"
  const monthNamesEn = Object.keys(MONTHS_EN).join("|");
  const reEn = new RegExp(`\\b(\\d{1,2})\\s+(${monthNamesEn})[a-z]*\\s+(\\d{4})\\b`, "gi");
  for (const m of text.matchAll(reEn)) {
    const day = m[1].padStart(2, "0");
    const month = MONTHS_EN[m[2].toLowerCase().slice(0, 3)];
    dates.add(`${m[3]}-${month}-${day}`);
  }

  return Array.from(dates);
}

/**
 * Estrae candidati "numero di volo" dal testo, filtrando i falsi
 * positivi più comuni (codici prenotazione a 6 caratteri, ecc.).
 */
function extractFlightNumbers(text) {
  const candidates = new Set();
  for (const m of text.matchAll(FLIGHT_NUMBER_REGEX)) {
    const code = m[1];
    // Scarta sequenze troppo lunghe/corte per essere un vero numero di volo
    if (code.length >= 3 && code.length <= 7) {
      candidates.add(code.toUpperCase());
    }
  }
  return Array.from(candidates);
}

/**
 * Analizza il testo di un'email inoltrata e ritorna una lista di
 * "candidati" (numero di volo + possibili date) da mostrare
 * all'utente per conferma prima di salvarli.
 */
export function parseBookingEmail({ subject = "", text = "" }) {
  const fullText = `${subject}\n${text}`;
  const flightNumbers = extractFlightNumbers(fullText);
  const dates = extractDates(fullText);

  return {
    flightNumbers,
    dates,
    // combinazione più probabile: primo volo trovato + prima data trovata
    bestGuess:
      flightNumbers.length && dates.length
        ? { flightNumber: flightNumbers[0], date: dates[0] }
        : null,
  };
}
