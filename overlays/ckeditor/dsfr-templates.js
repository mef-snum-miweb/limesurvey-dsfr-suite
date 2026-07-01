/**
 * Palette de composants DSFR pour l'éditeur CKEditor de LimeSurvey.
 *
 * Chargée via `config.templates_files` (cf. overlays/ckeditor/config.js).
 * Ajoute un bouton « Templates » dont la boîte de dialogue propose des
 * blocs DSFR prêts à insérer — pensés pour le champ AIDE d'une question ou
 * les textes d'introduction/fin (où le HTML riche est conservé).
 *
 * NB : ne pas utiliser dans l'INTITULÉ d'une question (aplati en <h3>).
 */
CKEDITOR.addTemplates('dsfr', {
    imagesPath: '',
    templates: [
        {
            title: 'Alerte — information',
            description: 'Bandeau d’information DSFR.',
            html:
                '<div class="fr-alert fr-alert--info">' +
                '<h3 class="fr-alert__title">Titre de l’information</h3>' +
                '<p>Texte de l’information.</p>' +
                '</div><p>&nbsp;</p>'
        },
        {
            title: 'Alerte — avertissement',
            description: 'Bandeau d’avertissement DSFR.',
            html:
                '<div class="fr-alert fr-alert--warning">' +
                '<h3 class="fr-alert__title">Titre de l’avertissement</h3>' +
                '<p>Texte de l’avertissement.</p>' +
                '</div><p>&nbsp;</p>'
        },
        {
            title: 'Mise en avant (callout)',
            description: 'Encadré de mise en avant DSFR.',
            html:
                '<div class="fr-callout">' +
                '<p class="fr-callout__text">Texte mis en avant.</p>' +
                '</div><p>&nbsp;</p>'
        },
        {
            title: 'Encadré (highlight)',
            description: 'Texte avec liseré latéral DSFR.',
            html:
                '<div class="fr-highlight">' +
                '<p>Texte encadré.</p>' +
                '</div><p>&nbsp;</p>'
        },
        {
            title: 'Texte d’introduction',
            description: 'Paragraphe de mise en exergue (lead).',
            html: '<p class="fr-text--lead">Texte d’introduction.</p>'
        }
    ]
});
