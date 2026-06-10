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

const CONTAINER = 'limesurvey-dev';

export async function ensureSurveyActive(sid: number, baseUrl = 'http://localhost:8081'): Promise<void> {
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
