import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../core/constants/app_spacing.dart';

/// A single shimmering placeholder block. Building block for skeleton screens
/// shown while content loads — friendlier than a bare spinner.
class SkeletonBox extends StatelessWidget {
  final double? width;
  final double height;
  final double radius;

  const SkeletonBox({
    super.key,
    this.width,
    this.height = 12,
    this.radius = AppSpacing.radiusMd,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: cs.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(radius),
      ),
    )
        .animate(onPlay: (c) => c.repeat())
        .shimmer(duration: 1200.ms, color: cs.surface.withValues(alpha: 0.6));
  }
}

/// Skeleton mirroring the check-in card layout.
class CheckinCardSkeleton extends StatelessWidget {
  const CheckinCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(AppSpacing.cardPadding),
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(AppSpacing.radiusXl),
        border: Border.all(color: cs.outlineVariant.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          Row(
            children: [
              SkeletonBox(width: 40, height: 40, radius: AppSpacing.radiusFull),
              SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SkeletonBox(width: 120, height: 12),
                    SizedBox(height: AppSpacing.xs),
                    SkeletonBox(width: 80, height: 10),
                  ],
                ),
              ),
            ],
          ),
          SizedBox(height: AppSpacing.md),
          SkeletonBox(height: 140, radius: AppSpacing.radiusLg),
          SizedBox(height: AppSpacing.md),
          SkeletonBox(width: double.infinity, height: 10),
          SizedBox(height: AppSpacing.xs),
          SkeletonBox(width: 200, height: 10),
        ],
      ),
    );
  }
}

/// A non-interactive list of check-in skeletons for full-screen loading states.
class CheckinListSkeleton extends StatelessWidget {
  final int count;

  const CheckinListSkeleton({super.key, this.count = 4});

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.pagePadding),
      physics: const NeverScrollableScrollPhysics(),
      itemCount: count,
      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
      itemBuilder: (_, __) => const CheckinCardSkeleton(),
    );
  }
}

/// Compact skeleton mirroring the coffee list row (thumbnail + two lines).
class CoffeeCardSkeleton extends StatelessWidget {
  const CoffeeCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(AppSpacing.cardPadding),
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(AppSpacing.radiusXl),
        border: Border.all(color: cs.outlineVariant.withValues(alpha: 0.3)),
      ),
      child: const Row(
        children: [
          SkeletonBox(width: 56, height: 56, radius: AppSpacing.radiusLg),
          SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SkeletonBox(width: 160, height: 12),
                SizedBox(height: AppSpacing.sm),
                SkeletonBox(width: 100, height: 10),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// A non-interactive list of coffee-row skeletons.
class CoffeeListSkeleton extends StatelessWidget {
  final int count;

  const CoffeeListSkeleton({super.key, this.count = 6});

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.pagePadding),
      physics: const NeverScrollableScrollPhysics(),
      itemCount: count,
      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
      itemBuilder: (_, __) => const CoffeeCardSkeleton(),
    );
  }
}
