import 'package:flutter/material.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/app_typography.dart';
import '../../core/constants/app_colors.dart';

class BadgeModel {
  final String slug;
  final String name;
  final String description;
  final String iconName;
  final bool earned;
  final DateTime? earnedAt;

  const BadgeModel({
    required this.slug,
    required this.name,
    required this.description,
    required this.iconName,
    required this.earned,
    this.earnedAt,
  });

  factory BadgeModel.fromJson(Map<String, dynamic> json) {
    final badge = json['badge'] as Map<String, dynamic>? ?? json;
    return BadgeModel(
      slug: badge['slug'] as String,
      name: badge['name'] as String,
      description: badge['description'] as String,
      iconName: badge['iconName'] as String,
      earned: json.containsKey('earnedAt'),
      earnedAt: json['earnedAt'] != null ? DateTime.parse(json['earnedAt'] as String) : null,
    );
  }
}

class BadgeChip extends StatelessWidget {
  final BadgeModel badge;

  const BadgeChip({super.key, required this.badge});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final earned = badge.earned;

    return Tooltip(
      message: badge.description,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
        decoration: BoxDecoration(
          color: earned ? cs.primaryContainer : cs.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
          border: earned
              ? Border.all(color: AppColors.roastedGoldLight, width: 1.5)
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              _iconData(badge.iconName),
              size: 16,
              color: earned ? AppColors.roastedGoldLight : cs.onSurfaceVariant.withOpacity(0.4),
            ),
            const SizedBox(width: AppSpacing.xs),
            Text(
              badge.name,
              style: AppTypography.textTheme.labelSmall?.copyWith(
                color: earned ? cs.onPrimaryContainer : cs.onSurfaceVariant.withOpacity(0.5),
                fontWeight: earned ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _iconData(String name) {
    const map = {
      'coffee': Icons.coffee,
      'local_cafe': Icons.local_cafe,
      'bolt': Icons.bolt,
      'dark_mode': Icons.dark_mode,
      'wb_sunny': Icons.wb_sunny,
      'public': Icons.public,
      'wb_twilight': Icons.wb_twilight,
      'science': Icons.science,
      'search': Icons.search,
      'group': Icons.group,
    };
    return map[name] ?? Icons.emoji_events;
  }
}
