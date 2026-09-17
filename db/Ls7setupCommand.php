<?php

/**
 * Commande dev LS7 : enregistre le thème DSFR et active les plugins DSFR
 * sur une instance LimeSurvey 7.x fraîchement installée (sans passer par l'UI).
 * Déposée par db/seed-ls7.sh (docker cp) — usage :
 *   console.php ls7setup
 *
 * - thème : TemplateManifest::importManifest('dsfr') + thème par défaut
 *   (LS7 : `surveys_groupsettings.template` du gsid 0, plus de
 *   `defaulttheme` dans settings_global) ;
 * - plugins : scanPlugins() ne crée pas les lignes en base → installPlugin()
 *   puis activation via l'événement beforeActivate (comme l'UI).
 */
class Ls7setupCommand extends CConsoleCommand
{
    public function run($args)
    {
        Yii::import('application.helpers.common_helper', true);

        if (!Template::model()->findByAttributes(['name' => 'dsfr'])) {
            echo 'theme dsfr: import ' . var_export(TemplateManifest::importManifest('dsfr'), true) . "\n";
        } else {
            echo "theme dsfr: déjà enregistré\n";
        }
        Yii::app()->db->createCommand("UPDATE {{surveys_groupsettings}} SET template='dsfr' WHERE gsid=0")->execute();

        $pm = App()->getPluginManager();
        $found = $pm->scanPlugins();
        foreach (['DSFRMail', 'ConversationIA', 'CKEditorDSFR'] as $name) {
            if (!Plugin::model()->findByAttributes(['name' => $name])) {
                if (empty($found[$name]['extensionConfig'])) {
                    echo "$name: KO introuvable\n";
                    continue;
                }
                $pm->installPlugin($found[$name]['extensionConfig'], $found[$name]['pluginType']);
            }
            $plugin = Plugin::model()->findByAttributes(['name' => $name]);
            if ($plugin && !$plugin->active) {
                $event = new PluginEvent('beforeActivate');
                $pm->dispatchEvent($event, $name);
                if ($event->get('success', true)) {
                    $plugin->active = 1;
                    $plugin->save();
                } else {
                    echo "$name: activation refusée : " . $event->get('message') . "\n";
                }
            }
            echo "$name: active=" . ($plugin ? $plugin->active : '?') . "\n";
        }
    }
}
