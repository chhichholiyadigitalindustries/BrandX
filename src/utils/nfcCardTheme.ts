/**
 * BRANDX - NFC Visiting Card Theme Configuration
 * 
 * Provides production-tested, high-contrast, visually stunning color palettes
 * for both browser preview and deterministic high-resolution PDF/image export.
 * All gradient and color values use standard CSS hex/rgba syntax for 100% 
 * compatibility with html2canvas and jsPDF rendering engines.
 */

export type NfcThemeId =
  | 'CLASSIC_DARK'
  | 'GOLD_LUXURY'
  | 'ROYAL_BLUE'
  | 'EMERALD_SLATE'
  | 'NEON_CYAN'
  | 'ELEGANT_WHITE';

export interface NfcThemeConfig {
  id: NfcThemeId;
  label: string;
  isDark: boolean;
  // Card Surface Backgrounds
  frontGradient: string;
  frontFallbackBg: string;
  backGradient: string;
  backFallbackBg: string;
  // Borders & Accents
  borderColor: string;
  borderHex: string;
  accentColor: string;
  badgeBg: string;
  chipBorder: string;
  // Typography
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  // QR Container on Back
  qrContainerBg: string;
  qrBorderColor: string;
  qrLabelColor: string;
}

export const NFC_THEMES: Record<NfcThemeId, NfcThemeConfig> = {
  CLASSIC_DARK: {
    id: 'CLASSIC_DARK',
    label: 'Classic Dark Obsidian',
    isDark: true,
    frontGradient: 'linear-gradient(135deg, #1E1B4B 0%, #0F172A 50%, #1E293B 100%)',
    frontFallbackBg: '#0F172A',
    backGradient: 'linear-gradient(135deg, #0B0F19 0%, #1E293B 100%)',
    backFallbackBg: '#0B0F19',
    borderColor: 'rgba(99, 102, 241, 0.45)',
    borderHex: '#6366F1',
    accentColor: '#60A5FA',
    badgeBg: 'rgba(255, 255, 255, 0.08)',
    chipBorder: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#C7D2FE',
    textMuted: '#94A3B8',
    qrContainerBg: '#FFFFFF',
    qrBorderColor: '#6366F1',
    qrLabelColor: '#0F172A',
  },
  GOLD_LUXURY: {
    id: 'GOLD_LUXURY',
    label: 'Gold Luxury Merchant',
    isDark: true,
    frontGradient: 'linear-gradient(135deg, #1C1917 0%, #292524 50%, #17140E 100%)',
    frontFallbackBg: '#1C1917',
    backGradient: 'linear-gradient(135deg, #110E09 0%, #292524 100%)',
    backFallbackBg: '#110E09',
    borderColor: 'rgba(245, 158, 11, 0.55)',
    borderHex: '#F59E0B',
    accentColor: '#FBBF24',
    badgeBg: 'rgba(245, 158, 11, 0.12)',
    chipBorder: '#F59E0B',
    textPrimary: '#FEF3C7',
    textSecondary: '#FDE68A',
    textMuted: '#D6D3D1',
    qrContainerBg: '#FFFFFF',
    qrBorderColor: '#D97706',
    qrLabelColor: '#78350F',
  },
  ROYAL_BLUE: {
    id: 'ROYAL_BLUE',
    label: 'Royal Sapphire Blue',
    isDark: true,
    frontGradient: 'linear-gradient(135deg, #0A192F 0%, #1E3A8A 50%, #0F172A 100%)',
    frontFallbackBg: '#0A192F',
    backGradient: 'linear-gradient(135deg, #030D1B 0%, #1E3A8A 100%)',
    backFallbackBg: '#030D1B',
    borderColor: 'rgba(59, 130, 246, 0.55)',
    borderHex: '#3B82F6',
    accentColor: '#38BDF8',
    badgeBg: 'rgba(59, 130, 246, 0.14)',
    chipBorder: '#60A5FA',
    textPrimary: '#FFFFFF',
    textSecondary: '#93C5FD',
    textMuted: '#94A3B8',
    qrContainerBg: '#FFFFFF',
    qrBorderColor: '#2563EB',
    qrLabelColor: '#1E3A8A',
  },
  EMERALD_SLATE: {
    id: 'EMERALD_SLATE',
    label: 'Emerald Vyapari Slate',
    isDark: true,
    frontGradient: 'linear-gradient(135deg, #062E24 0%, #064E3B 50%, #0F172A 100%)',
    frontFallbackBg: '#062E24',
    backGradient: 'linear-gradient(135deg, #041F18 0%, #064E3B 100%)',
    backFallbackBg: '#041F18',
    borderColor: 'rgba(16, 185, 129, 0.55)',
    borderHex: '#10B981',
    accentColor: '#34D399',
    badgeBg: 'rgba(16, 185, 129, 0.14)',
    chipBorder: '#34D399',
    textPrimary: '#ECFDF5',
    textSecondary: '#A7F3D0',
    textMuted: '#94A3B8',
    qrContainerBg: '#FFFFFF',
    qrBorderColor: '#059669',
    qrLabelColor: '#064E3B',
  },
  NEON_CYAN: {
    id: 'NEON_CYAN',
    label: 'Neon Cyber Cyan',
    isDark: true,
    frontGradient: 'linear-gradient(135deg, #082F49 0%, #0C4A6E 50%, #030712 100%)',
    frontFallbackBg: '#082F49',
    backGradient: 'linear-gradient(135deg, #020E17 0%, #082F49 100%)',
    backFallbackBg: '#020E17',
    borderColor: 'rgba(6, 182, 212, 0.55)',
    borderHex: '#06B6D4',
    accentColor: '#22D3EE',
    badgeBg: 'rgba(6, 182, 212, 0.14)',
    chipBorder: '#22D3EE',
    textPrimary: '#F0FDFA',
    textSecondary: '#67E8F9',
    textMuted: '#94A3B8',
    qrContainerBg: '#FFFFFF',
    qrBorderColor: '#0891B2',
    qrLabelColor: '#164E63',
  },
  ELEGANT_WHITE: {
    id: 'ELEGANT_WHITE',
    label: 'Elegant Pearl White',
    isDark: false,
    frontGradient: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 50%, #EEF2F6 100%)',
    frontFallbackBg: '#FFFFFF',
    backGradient: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)',
    backFallbackBg: '#F8FAFC',
    borderColor: 'rgba(99, 102, 241, 0.35)',
    borderHex: '#6366F1',
    accentColor: '#4F46E5',
    badgeBg: 'rgba(99, 102, 241, 0.08)',
    chipBorder: '#D97706',
    textPrimary: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#64748B',
    qrContainerBg: '#FFFFFF',
    qrBorderColor: '#4F46E5',
    qrLabelColor: '#0F172A',
  },
};

/**
 * Normalizes any theme input string into a valid NfcThemeConfig
 */
export function getNfcCardTheme(themeId?: string | null): NfcThemeConfig {
  if (!themeId) return NFC_THEMES.CLASSIC_DARK;
  const upper = themeId.toUpperCase().trim() as NfcThemeId;
  return NFC_THEMES[upper] || NFC_THEMES.CLASSIC_DARK;
}
