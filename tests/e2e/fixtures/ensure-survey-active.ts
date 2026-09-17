/**
 * Garantit qu'un questionnaire de démo est actif avant un walk E2E.
 *
 * Le seed livre 527199 avec `active='N'` parce que sa table de réponses
 * (`lime_survey_527199`) est désynchronisée de la structure du questionnaire
 * (colonne 527199X22X264 absente) : l'activer par simple UPDATE SQL produit
 * un 500 (« Attribute not found in the model ») au premier POST.
 *
 * La commande console `activatesurvey` (db/ActivatesurveyCommand.php,
 * copiée dans le conteneur) ré-active proprement : désactivation, DROP de
 * la table obsolète, ré-activation via SurveyActivator (qui régénère la
 * table de réponses à partir de la structure courante).
 *
 * Idempotent : si le questionnaire répond déjà en 200, on ne touche à rien
 * (l'activation DROP les réponses existantes — à ne faire qu'à froid).
 */
import { execSync } from 'node:child_process';

import { WEB_CONTAINER, BASE_URL, mysql } from '../helpers/env';

const CONTAINER = WEB_CONTAINER;

/** Lève les bornes de date (expiration / ouverture) d'un questionnaire de test. */
function clearSurveyDeadlines(sid: number): void {
  mysql(`UPDATE lime_surveys SET expires = NULL, startdate = NULL WHERE sid = ${sid};`);
}

export async function ensureSurveyActive(sid: number, baseUrl = BASE_URL): Promise<void> {
  // suite#22 : une date d'expiration passée rend le questionnaire injouable
  // SANS erreur HTTP — le core sert une page « questionnaire expiré » en 200.
  // Les walks partaient donc en timeout sur le bouton d'envoi, jamais rendu.
  // Le dump de seed porte `expires` (527199 : 2026-07-02), et chaque reseed la
  // restaure : on la lève ici plutôt qu'à la main.
  clearSurveyDeadlines(sid);

  const res = await fetch(`${baseUrl}/index.php/${sid}?newtest=Y&lang=fr`, { redirect: 'follow' });
  if (res.ok) {
    return;
  }

  execSync(
    `docker cp db/ActivatesurveyCommand.php ${CONTAINER}:/var/www/html/application/commands/ActivatesurveyCommand.php`,
    { stdio: 'pipe' },
  );
  const out = execSync(
    `docker exec ${CONTAINER} php /var/www/html/application/commands/console.php activatesurvey ${sid}`,
    { stdio: 'pipe' },
  ).toString();
  if (!out.includes('OK')) {
    throw new Error(`Activation du questionnaire ${sid} en échec : ${out}`);
  }

  const verify = await fetch(`${baseUrl}/index.php/${sid}?newtest=Y&lang=fr`);
  if (!verify.ok) {
    throw new Error(`Le questionnaire ${sid} répond encore ${verify.status} après activation`);
  }
}
