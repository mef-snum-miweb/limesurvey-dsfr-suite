/**
 * Conversion format d'affichage ↔ format natif (date-native.js).
 * Le serveur LimeSurvey parse la réponse au format d'affichage du sondage :
 * ces conversions sont ce qui garantit qu'un input natif (ISO) soumet
 * la bonne valeur quel que soit dateformatdetails.
 */
import { describe, it, expect } from 'vitest';
// @ts-expect-error module JS sans types
import {
    parseDisplayValue,
    formatDisplayValue,
    parseNativeValue,
    formatNativeValue,
} from '../../modules/theme-dsfr/src/inputs/date-native.js';

describe('parseDisplayValue', () => {
    it('parse DD/MM/YYYY', () => {
        expect(parseDisplayValue('25/12/2026', 'DD/MM/YYYY')).toMatchObject({
            YYYY: '2026', MM: '12', DD: '25',
        });
    });

    it('parse DD.MM.YYYY (format allemand)', () => {
        expect(parseDisplayValue('05.01.2026', 'DD.MM.YYYY')).toMatchObject({
            YYYY: '2026', MM: '01', DD: '05',
        });
    });

    it('parse MM-DD-YYYY (format US)', () => {
        expect(parseDisplayValue('12-25-2026', 'MM-DD-YYYY')).toMatchObject({
            YYYY: '2026', MM: '12', DD: '25',
        });
    });

    it('parse avec heure DD/MM/YYYY HH:mm', () => {
        expect(parseDisplayValue('01/02/2026 09:30', 'DD/MM/YYYY HH:mm')).toMatchObject({
            YYYY: '2026', MM: '02', DD: '01', HH: '09', mm: '30',
        });
    });

    it('complète les composantes à un chiffre', () => {
        expect(parseDisplayValue('1/2/2026', 'DD/MM/YYYY')).toMatchObject({
            MM: '02', DD: '01',
        });
    });

    it('retourne null sur une valeur non conforme au format', () => {
        expect(parseDisplayValue('2026-12-25', 'DD/MM/YYYY')).toBeNull();
        expect(parseDisplayValue('hello', 'DD/MM/YYYY')).toBeNull();
    });
});

describe('formatDisplayValue', () => {
    it('reformate vers DD/MM/YYYY', () => {
        const comp = parseNativeValue('2026-12-25');
        expect(formatDisplayValue(comp, 'DD/MM/YYYY')).toBe('25/12/2026');
    });

    it('reformate avec heure', () => {
        const comp = parseNativeValue('2026-02-01T09:30');
        expect(formatDisplayValue(comp, 'DD.MM.YYYY HH:mm')).toBe('01.02.2026 09:30');
    });
});

describe('parseNativeValue / formatNativeValue', () => {
    it('roundtrip date seule', () => {
        const comp = parseNativeValue('2026-06-10');
        expect(formatNativeValue(comp, false)).toBe('2026-06-10');
    });

    it('roundtrip datetime-local', () => {
        const comp = parseNativeValue('2026-06-10T14:05');
        expect(formatNativeValue(comp, true)).toBe('2026-06-10T14:05');
    });

    it('valeur native invalide → null', () => {
        expect(parseNativeValue('25/12/2026')).toBeNull();
    });
});

describe('aller-retour complet (soumission)', () => {
    it.each([
        ['DD/MM/YYYY', '31/01/2026'],
        ['DD.MM.YYYY', '28.02.2026'],
        ['MM/DD/YYYY', '02/28/2026'],
        ['YYYY-MM-DD', '2026-02-28'],
    ])('format %s : affichage → ISO → affichage', (fmt, display) => {
        const comp = parseDisplayValue(display, fmt);
        expect(comp).not.toBeNull();
        const iso = formatNativeValue(comp, false);
        const back = formatDisplayValue(parseNativeValue(iso), fmt);
        expect(back).toBe(display);
    });
});
