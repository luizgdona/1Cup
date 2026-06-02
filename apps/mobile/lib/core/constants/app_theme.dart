import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_typography.dart';
import 'app_spacing.dart';

class AppTheme {
  AppTheme._();

  static ThemeData get light => ThemeData(
        useMaterial3: true,
        colorScheme: AppColors.lightScheme,
        textTheme: AppTypography.textTheme,
        scaffoldBackgroundColor: AppColors.backgroundLight,
        appBarTheme: AppBarTheme(
          backgroundColor: AppColors.lightScheme.surface,
          foregroundColor: AppColors.lightScheme.onSurface,
          elevation: 0,
          scrolledUnderElevation: 1,
        ),
        cardTheme: CardThemeData(
          elevation: 1,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusXl),
          ),
          color: AppColors.cremaWhite,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColors.lightScheme.surfaceContainerHighest.withValues(alpha: 0.4),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
            borderSide: BorderSide.none,
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
            borderSide: BorderSide(
              color: AppColors.lightScheme.primary,
              width: 2,
            ),
          ),
        ),
        bottomNavigationBarTheme: BottomNavigationBarThemeData(
          backgroundColor: AppColors.lightScheme.surface,
          selectedItemColor: AppColors.lightScheme.primary,
          unselectedItemColor: AppColors.lightScheme.onSurfaceVariant,
          type: BottomNavigationBarType.fixed,
          elevation: 8,
        ),
        floatingActionButtonTheme: FloatingActionButtonThemeData(
          backgroundColor: AppColors.lightScheme.primary,
          foregroundColor: AppColors.lightScheme.onPrimary,
          shape: const CircleBorder(),
        ),
        chipTheme: ChipThemeData(
          backgroundColor: AppColors.latteBeigeLight,
          labelStyle: AppTypography.textTheme.labelSmall?.copyWith(
            color: AppColors.lightScheme.primary,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
          ),
        ),
        dividerTheme: DividerThemeData(
          color: AppColors.lightScheme.outlineVariant,
          thickness: 1,
        ),
        snackBarTheme: SnackBarThemeData(
          backgroundColor: AppColors.lightScheme.inverseSurface,
          contentTextStyle: AppTypography.textTheme.bodyMedium?.copyWith(
            color: AppColors.lightScheme.onInverseSurface,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );

  static ThemeData get dark => ThemeData(
        useMaterial3: true,
        colorScheme: AppColors.darkScheme,
        textTheme: AppTypography.textTheme.apply(
          bodyColor: AppColors.darkScheme.onSurface,
          displayColor: AppColors.darkScheme.onSurface,
        ),
        scaffoldBackgroundColor: AppColors.backgroundDark,
        appBarTheme: AppBarTheme(
          backgroundColor: AppColors.darkScheme.surface,
          foregroundColor: AppColors.darkScheme.onSurface,
          elevation: 0,
          scrolledUnderElevation: 1,
        ),
        cardTheme: CardThemeData(
          elevation: 2,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusXl),
          ),
          color: AppColors.darkScheme.surfaceContainerHighest,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColors.darkScheme.surfaceContainerHighest.withValues(alpha: 0.6),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
            borderSide: BorderSide.none,
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
            borderSide: BorderSide(
              color: AppColors.darkScheme.primary,
              width: 2,
            ),
          ),
        ),
        bottomNavigationBarTheme: BottomNavigationBarThemeData(
          backgroundColor: AppColors.darkScheme.surface,
          selectedItemColor: AppColors.darkScheme.primary,
          unselectedItemColor: AppColors.darkScheme.onSurfaceVariant,
          type: BottomNavigationBarType.fixed,
          elevation: 8,
        ),
        floatingActionButtonTheme: FloatingActionButtonThemeData(
          backgroundColor: AppColors.darkScheme.primary,
          foregroundColor: AppColors.darkScheme.onPrimary,
          shape: const CircleBorder(),
        ),
        chipTheme: ChipThemeData(
          backgroundColor: AppColors.latteBeigeDark,
          labelStyle: AppTypography.textTheme.labelSmall?.copyWith(
            color: AppColors.darkScheme.primary,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
          ),
        ),
        dividerTheme: DividerThemeData(
          color: AppColors.darkScheme.outlineVariant,
          thickness: 1,
        ),
        snackBarTheme: SnackBarThemeData(
          backgroundColor: AppColors.darkScheme.inverseSurface,
          contentTextStyle: AppTypography.textTheme.bodyMedium?.copyWith(
            color: AppColors.darkScheme.onInverseSurface,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
}
