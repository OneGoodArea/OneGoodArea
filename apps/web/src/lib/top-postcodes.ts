/* Seed list of top UK postcodes for time-series re-scoring.
 *
 * Used by scripts/cron/rescore-top-postcodes.ts to compound a UK area
 * trend dataset over time. Every month, every postcode in this list is
 * scored against all four intents and the result is persisted to
 * report_history.
 *
 * Starting list: ~100 entries covering major English, Welsh, and Scottish
 * urban centres plus a few rural and coastal samples. Pedro can expand
 * toward 10,000 by adding postcode districts from the ONS open postcode
 * directory or by routing the search-volume tail.
 *
 * Each entry is a representative postcode for a postcode district. We
 * only need one postcode per district for the time-series — the LSOA
 * resolution is what actually drives the score.
 */

export const TOP_POSTCODES: string[] = [
  /* London — central + key zones */
  "EC1A 1BB", "EC2A 4DR", "EC3A 5AT", "EC4A 1AB",
  "WC1A 2DE", "WC2N 4HZ",
  "W1B 5TB", "W2 1HQ", "W6 9JT", "W8 5SH", "W11 2BS", "W14 8UX",
  "SW1A 1AA", "SW3 4SR", "SW4 0LG", "SW7 5BD", "SW11 1JG", "SW18 1RZ",
  "SE1 9SG", "SE5 8AF", "SE10 0HS", "SE15 4ED", "SE22 9HF",
  "N1 9AG", "N7 8JL", "N16 0AS", "N19 5JT",
  "NW1 2DB", "NW3 2BG", "NW5 3DP", "NW10 4UA",
  "E1 6AN", "E2 8DG", "E5 0DJ", "E8 1HE", "E14 5AB", "E17 4QH",

  /* Birmingham */
  "B1 1AA", "B5 4JU", "B12 9LR", "B16 8RD", "B29 7QE",

  /* Manchester */
  "M1 1AE", "M3 5EJ", "M4 5JD", "M14 5HU", "M20 2RX", "M50 3UB",

  /* Leeds */
  "LS1 4DT", "LS2 9JT", "LS6 3LN", "LS11 5AH",

  /* Liverpool */
  "L1 8JQ", "L3 5UX", "L8 5SP", "L18 8HE",

  /* Sheffield */
  "S1 2HE", "S10 5BG", "S11 7BS",

  /* Bristol */
  "BS1 4DJ", "BS6 6PN", "BS8 1QU", "BS16 1QY",

  /* Newcastle */
  "NE1 7RU", "NE2 4DS", "NE6 5SJ",

  /* Nottingham */
  "NG1 5DT", "NG7 2RD", "NG2 5LW",

  /* Brighton */
  "BN1 1UF", "BN2 5RA", "BN3 1JE",

  /* Cambridge */
  "CB1 2JG", "CB2 1TN", "CB4 3NQ",

  /* Oxford */
  "OX1 2JD", "OX2 6HG", "OX4 1AY",

  /* Other major English cities */
  "RG1 4PS", "GU1 4UJ", "PO1 2HE", "SO14 7LL", "PL1 1AA",
  "EX1 1NQ", "BA1 2BJ", "GL1 1DG", "CV1 5RW", "LE1 1WB",
  "DE1 2GU", "ST1 4QS", "WV1 1RW", "BD1 1HX", "HU1 1NQ",
  "DH1 3BG", "YO1 7HH", "SK1 3JB",

  /* Wales */
  "CF10 1EP", "CF24 4JE",   // Cardiff
  "SA1 3SN", "SA2 8PP",     // Swansea
  "NP20 1XG",               // Newport
  "LL57 2DG",               // Bangor

  /* Scotland */
  "EH1 1YZ", "EH3 9DR", "EH8 9LD",   // Edinburgh
  "G1 1XQ", "G3 7DN", "G12 8QQ", "G42 9HY",   // Glasgow
  "AB10 1AB",                // Aberdeen
  "DD1 4HN",                 // Dundee
  "PH1 5EJ",                 // Perth

  /* Coastal + smaller towns (sample for area-type balance) */
  "TR1 2QE",      // Truro
  "TQ1 4SR",      // Torquay
  "BH1 2AA",      // Bournemouth
  "CT1 2HN",      // Canterbury
  "MK9 3HS",      // Milton Keynes
];
