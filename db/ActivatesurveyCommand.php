<?php

/**
 * Commande dev : (ré)active un sondage en régénérant sa table de réponses.
 * Déposée par la suite de tests (docker cp) — usage :
 *   console.php activatesurvey <sid>
 *
 * Sert au questionnaire de démo 527199 dont la table de réponses du seed
 * est désynchronisée de la structure (colonne 527199X22X264 absente) :
 * on le ré-active proprement, LimeSurvey recrée la table.
 */
class ActivatesurveyCommand extends CConsoleCommand
{
    public function run($args)
    {
        // Helpers absents du bootstrap console (sanitize_filename, gT…)
        Yii::app()->loadHelper('common');
        Yii::app()->loadHelper('database');
        Yii::app()->loadHelper('surveytranslator');
        // LimeExpressionManager + EmCacheHelper (comme le fait le web)
        Yii::import('application.helpers.expressions.em_manager_helper', true);

        $sid = (int) ($args[0] ?? 0);
        $survey = Survey::model()->findByPk($sid);
        if (!$survey) {
            echo "KO survey $sid introuvable\n";
            return 1;
        }

        // Désactiver et purger l'éventuelle table de réponses obsolète.
        Yii::app()->db->createCommand("UPDATE {{surveys}} SET active='N' WHERE sid=$sid")->execute();
        Yii::app()->db->createCommand("DROP TABLE IF EXISTS {{survey_$sid}}")->execute();
        Yii::app()->db->createCommand("DROP TABLE IF EXISTS {{survey_{$sid}_timings}}")->execute();

        // Recharger le modèle et activer (recrée la table de réponses).
        $survey = Survey::model()->findByPk($sid);
        $activator = new SurveyActivator($survey);
        $result = $activator->activate();
        if (!empty($result['error'])) {
            echo 'KO activation: ' . print_r($result, true) . "\n";
            return 1;
        }
        Yii::app()->db->createCommand("UPDATE {{surveys}} SET active='Y' WHERE sid=$sid")->execute();
        echo "OK survey $sid activé, table de réponses régénérée\n";
        return 0;
    }
}
