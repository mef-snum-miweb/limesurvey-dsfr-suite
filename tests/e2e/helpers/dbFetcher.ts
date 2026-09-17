import { mysql, responseTable } from './env';

/**
 * Lit la dernière réponse complète (submitdate NON NULL) du questionnaire
 * directement depuis la base de données MySQL du conteneur Docker de dev.
 *
 * Utilisé par la suite de tests `--results` pour vérifier que ce qui a été
 * saisi côté front est bien restitué dans les résultats LimeSurvey.
 *
 * @param surveyId ID du questionnaire (par défaut 282267 = questionnaire RGAA de test)
 * @returns Un dictionnaire {nom_de_colonne → valeur}, où les colonnes correspondent
 *          aux SGQA des questions (ex: "282267X1X1").
 */
export function getLatestSubmittedResponse(surveyId = 282267): Record<string, string | null> {
  const table = responseTable(surveyId);
  const out = mysql(
    `SELECT * FROM \`${table}\` WHERE submitdate IS NOT NULL ORDER BY id DESC LIMIT 1\\G`,
  );

  const row: Record<string, string | null> = {};
  const lines = out.split('\n');
  for (const line of lines) {
    const m = line.match(/^\s*([^:]+):\s?(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    const value = m[2];
    if (key.startsWith('*') || key === '') continue;
    row[key] = value === 'NULL' ? null : value;
  }

  return row;
}

/** Compte le nombre de réponses soumises (utile pour s'assurer qu'une nouvelle a été créée). */
export function countSubmittedResponses(surveyId = 282267): number {
  const table = responseTable(surveyId);
  const out = mysql(`SELECT COUNT(*) FROM \`${table}\` WHERE submitdate IS NOT NULL;`, ['-sN']);
  return parseInt(out.trim(), 10) || 0;
}
