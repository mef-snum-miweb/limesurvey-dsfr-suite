import { execFileSync } from 'node:child_process';

/**
 * Environnement de test — gate double 6.x / 7.x (ADR-129).
 *
 * Les tests ne doivent jamais coder en dur ni le nom des conteneurs, ni le port,
 * ni le nommage des tables : LimeSurvey 7 a renommé les tables de réponses
 * (`survey_<sid>` → `responses_<sid>`, `survey_<sid>_timings` → `timings_<sid>`)
 * et les colonnes (SGQA `282267X1X1` → `Q<qid>`).
 *
 * Variables (mêmes noms que docker-compose.dev.yml) :
 *   LS_PREFIX  — préfixe des conteneurs (défaut `limesurvey-dev`)
 *   LS_PORT    — port hôte de l'app       (défaut 8081)
 */
export const LS_PREFIX = process.env.LS_PREFIX || 'limesurvey-dev';
export const WEB_CONTAINER = LS_PREFIX;
export const DB_CONTAINER = `${LS_PREFIX}-db`;
export const LS_PORT = process.env.LS_PORT || '8081';
export const BASE_URL = process.env.LS_BASE_URL || `http://localhost:${LS_PORT}`;

/** Exécute une requête SQL dans le conteneur MySQL et renvoie la sortie brute. */
export function mysql(sql: string, extraArgs: string[] = []): string {
  return execFileSync(
    'docker',
    [
      'exec',
      DB_CONTAINER,
      'mysql',
      '-u', 'limesurvey',
      '-plimesurvey',
      'limesurvey',
      ...extraArgs,
      '-e', sql,
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
  );
}

const responseTableCache = new Map<number, string>();

/**
 * Nom de la table de réponses du questionnaire, selon la version du core.
 * Détecté en base (et non déduit d'un numéro de version) : c'est la même
 * logique de feature-detection que les overrides Twig.
 */
export function responseTable(surveyId: number): string {
  const cached = responseTableCache.get(surveyId);
  if (cached) return cached;

  const out = mysql(`SHOW TABLES LIKE '%_${surveyId}'`, ['-N']);
  const tables = out.split('\n').map((l) => l.trim()).filter(Boolean);
  // LS7 d'abord : sur une base migrée, les deux nommages peuvent coexister
  // (`lime_old_responses_…` des archives), on ne garde que la table courante.
  const table =
    tables.find((t) => t === `lime_responses_${surveyId}`) ||
    tables.find((t) => t === `lime_survey_${surveyId}`);

  if (!table) {
    throw new Error(
      `Aucune table de réponses pour le questionnaire ${surveyId} ` +
        `(cherché lime_responses_${surveyId} et lime_survey_${surveyId} dans ${DB_CONTAINER}). ` +
        `Le questionnaire est-il activé ?`,
    );
  }
  responseTableCache.set(surveyId, table);
  return table;
}

/** Idem pour la table des temps de réponse. */
export function timingsTable(surveyId: number): string {
  const out = mysql(`SHOW TABLES LIKE '%timings%${surveyId}%'`, ['-N']);
  const tables = out.split('\n').map((l) => l.trim()).filter(Boolean);
  return (
    tables.find((t) => t === `lime_timings_${surveyId}`) ||
    tables.find((t) => t === `lime_survey_${surveyId}_timings`) ||
    `lime_timings_${surveyId}`
  );
}

/**
 * Instantané / restauration de la définition d'un questionnaire (suite#31).
 *
 * Remplace le rejeu de `db/seed.sh --force` : ce dump est figé au schéma 6.x et
 * le rejouer sur une base migrée en 7.x recrée les tables au format 6.x, ce qui
 * casse l'instance et fausse tous les tests suivants. Un dump ciblé des tables
 * de définition, pris et restauré à chaud, est indépendant de la version.
 */
const SURVEY_DEF_TABLES = ['lime_surveys', 'lime_questions', 'lime_question_attributes'];

export function snapshotSurveyDefinition(): string {
  return execFileSync(
    'docker',
    [
      'exec', DB_CONTAINER,
      'mysqldump', '-u', 'limesurvey', '-plimesurvey',
      '--no-tablespaces', '--skip-add-locks', '--complete-insert',
      'limesurvey', ...SURVEY_DEF_TABLES,
    ],
    { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] },
  );
}

export function restoreSurveyDefinition(dump: string): void {
  execFileSync(
    'docker',
    ['exec', '-i', DB_CONTAINER, 'mysql', '-u', 'limesurvey', '-plimesurvey', 'limesurvey'],
    { input: dump, maxBuffer: 256 * 1024 * 1024, stdio: ['pipe', 'pipe', 'ignore'] },
  );
}
