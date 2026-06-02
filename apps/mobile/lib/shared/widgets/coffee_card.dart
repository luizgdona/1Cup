import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/coffee_model.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/app_typography.dart';
import '../../core/constants/app_colors.dart';

class CoffeeCard extends StatelessWidget {
  final CoffeeModel coffee;
  final VoidCallback? onTap;

  const CoffeeCard({super.key, required this.coffee, this.onTap});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.cardPadding),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Label image / placeholder
              _CoffeeImage(url: coffee.labelImageUrl),
              const SizedBox(width: AppSpacing.md),
              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      coffee.name,
                      style: AppTypography.textTheme.titleMedium?.copyWith(color: cs.onSurface),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      coffee.roastery.name,
                      style: AppTypography.textTheme.bodySmall?.copyWith(color: cs.secondary),
                    ),
                    if (coffee.roastery.location.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        coffee.roastery.location,
                        style: AppTypography.textTheme.labelSmall?.copyWith(color: cs.onSurfaceVariant),
                      ),
                    ],
                    const SizedBox(height: AppSpacing.sm),
                    // Tags
                    Wrap(
                      spacing: AppSpacing.xs,
                      runSpacing: AppSpacing.xs,
                      children: [
                        if (coffee.roastColor != null) _Tag(coffee.roastLabel, cs),
                        if (coffee.processMethod != null) _Tag(coffee.processMethod!, cs),
                        if (coffee.variety != null) _Tag(coffee.variety!, cs),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    // Rating + checkins
                    Row(
                      children: [
                        Icon(Icons.star_rounded, size: 16, color: AppColors.roastedGoldLight),
                        const SizedBox(width: 2),
                        Text(
                          coffee.avgRating != null
                              ? coffee.avgRating!.toStringAsFixed(1)
                              : '—',
                          style: AppTypography.textTheme.labelMedium?.copyWith(color: cs.onSurface),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Text(
                          '${coffee.checkinCount} check-in${coffee.checkinCount != 1 ? 's' : ''}',
                          style: AppTypography.textTheme.labelSmall?.copyWith(color: cs.onSurfaceVariant),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CoffeeImage extends StatelessWidget {
  final String? url;
  const _CoffeeImage({this.url});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    const size = 72.0;

    if (url == null) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: cs.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        ),
        child: Icon(Icons.coffee_outlined, color: cs.onSurfaceVariant, size: 32),
      );
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
      child: CachedNetworkImage(
        imageUrl: url!,
        width: size,
        height: size,
        fit: BoxFit.cover,
        placeholder: (_, __) => Container(
          width: size,
          height: size,
          color: cs.surfaceContainerHighest,
        ),
        errorWidget: (_, __, ___) => Container(
          width: size,
          height: size,
          color: cs.surfaceContainerHighest,
          child: Icon(Icons.coffee_outlined, color: cs.onSurfaceVariant),
        ),
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  final String label;
  final ColorScheme cs;
  const _Tag(this.label, this.cs);

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: cs.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
        ),
        child: Text(
          label,
          style: TextStyle(fontSize: 10, color: cs.onSurfaceVariant, fontWeight: FontWeight.w500),
        ),
      );
}
