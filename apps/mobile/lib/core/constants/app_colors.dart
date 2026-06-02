import 'package:flutter/material.dart';

// ============================================================
// PALETA 1CUP
// Inspiração: grãos torrados, crema, cerâmica artesanal
// ============================================================

class AppColors {
  AppColors._();

  // --- Cores Base ---
  static const Color espressoBlack = Color(0xFF1D1C1D);
  static const Color roastedGold = Color(0xFFFFC000);
  static const Color latteBeige = Color(0xFFE9EDC9);
  static const Color cremaWhite = Color(0xFFFFFFFF);

  // --- Light Mode ---
  static const ColorScheme lightScheme = ColorScheme(
    brightness: Brightness.light,
    primary: Color(0xFF26170C),
    onPrimary: Color(0xFFFFFFFF),
    primaryContainer: Color(0xFF3D2B1F),
    onPrimaryContainer: Color(0xFFAC9181),
    secondary: Color(0xFF7D562D),
    onSecondary: Color(0xFFFFFFFF),
    secondaryContainer: Color(0xFFFFCA98),
    onSecondaryContainer: Color(0xFF7A532A),
    tertiary: Color(0xFF001E22),
    onTertiary: Color(0xFFFFFFFF),
    tertiaryContainer: Color(0xFF00353A),
    onTertiaryContainer: Color(0xFF50A3AD),
    error: Color(0xFFBA1A1A),
    onError: Color(0xFFFFFFFF),
    errorContainer: Color(0xFFFFDAD6),
    onErrorContainer: Color(0xFF93000A),
    surface: Color(0xFFFDF8F5),
    onSurface: Color(0xFF1C1B1A),
    surfaceContainerHighest: Color(0xFFE6E2DF),
    onSurfaceVariant: Color(0xFF4F453F),
    outline: Color(0xFF81756E),
    outlineVariant: Color(0xFFD2C4BC),
    shadow: Color(0xFF000000),
    inverseSurface: Color(0xFF32302E),
    onInverseSurface: Color(0xFFF5F0ED),
    inversePrimary: Color(0xFFDEC1AF),
  );

  // --- Dark Mode ---
  static const ColorScheme darkScheme = ColorScheme(
    brightness: Brightness.dark,
    primary: Color(0xFFDEC1AF),
    onPrimary: Color(0xFF3E2417),
    primaryContainer: Color(0xFF5A3828),
    onPrimaryContainer: Color(0xFFFBDDCA),
    secondary: Color(0xFFF0BD8B),
    onSecondary: Color(0xFF452A0A),
    secondaryContainer: Color(0xFF623F18),
    onSecondaryContainer: Color(0xFFFFDCBD),
    tertiary: Color(0xFF82D3DE),
    onTertiary: Color(0xFF00363C),
    tertiaryContainer: Color(0xFF004F56),
    onTertiaryContainer: Color(0xFF9FF0FB),
    error: Color(0xFFFFB4AB),
    onError: Color(0xFF690005),
    errorContainer: Color(0xFF93000A),
    onErrorContainer: Color(0xFFFFDAD6),
    surface: Color(0xFF1C1A18),
    onSurface: Color(0xFFE8E0DA),
    surfaceContainerHighest: Color(0xFF2E2A27),
    onSurfaceVariant: Color(0xFFD2C4BC),
    outline: Color(0xFF9B8B83),
    outlineVariant: Color(0xFF4F453F),
    shadow: Color(0xFF000000),
    inverseSurface: Color(0xFFE8E0DA),
    onInverseSurface: Color(0xFF32302E),
    inversePrimary: Color(0xFF26170C),
  );

  // --- Cores Customizadas (fora do Material) ---
  static const Color roastedGoldLight = Color(0xFFFFC000);
  static const Color roastedGoldDark = Color(0xFFFFD54F);
  static const Color latteBeigeLight = Color(0xFFE9EDC9);
  static const Color latteBeigeDark = Color(0xFF2A2E1A);
  static const Color backgroundLight = Color(0xFFFDF8F5);
  static const Color backgroundDark = Color(0xFF141210);
}
