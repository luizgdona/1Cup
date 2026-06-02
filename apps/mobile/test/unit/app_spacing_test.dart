import 'package:flutter_test/flutter_test.dart';
import 'package:one_cup/core/constants/app_spacing.dart';

void main() {
  group('AppSpacing token hierarchy', () {
    test('spacing scale is strictly ascending', () {
      expect(AppSpacing.xs, lessThan(AppSpacing.sm));
      expect(AppSpacing.sm, lessThan(AppSpacing.md));
      expect(AppSpacing.md, lessThan(AppSpacing.lg));
      expect(AppSpacing.lg, lessThan(AppSpacing.xl));
      expect(AppSpacing.xl, lessThan(AppSpacing.xxl));
      expect(AppSpacing.xxl, lessThan(AppSpacing.xxxl));
    });

    test('radius scale is strictly ascending', () {
      expect(AppSpacing.radiusSm, lessThan(AppSpacing.radiusMd));
      expect(AppSpacing.radiusMd, lessThan(AppSpacing.radiusLg));
      expect(AppSpacing.radiusLg, lessThan(AppSpacing.radiusXl));
      expect(AppSpacing.radiusXl, lessThan(AppSpacing.radiusFull));
    });

    test('cardPadding equals md', () {
      expect(AppSpacing.cardPadding, AppSpacing.md);
    });

    test('pagePadding equals md', () {
      expect(AppSpacing.pagePadding, AppSpacing.md);
    });

    test('radiusFull is large enough for pill shapes', () {
      expect(AppSpacing.radiusFull, greaterThanOrEqualTo(100));
    });
  });
}
