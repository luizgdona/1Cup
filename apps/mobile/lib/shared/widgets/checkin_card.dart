import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:intl/intl.dart';
import '../models/checkin_model.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/app_typography.dart';
import 'star_rating.dart';

class CheckinCard extends StatelessWidget {
  final CheckinModel checkin;
  final VoidCallback? onTap;
  final VoidCallback? onCoffeeTap;

  const CheckinCard({super.key, required this.checkin, this.onTap, this.onCoffeeTap});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Header ──────────────────────────────────
            Padding(
              padding: const EdgeInsets.all(AppSpacing.cardPadding),
              child: Row(
                children: [
                  _Avatar(user: checkin.user),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          checkin.user.displayName,
                          style: AppTypography.textTheme.titleSmall?.copyWith(color: cs.onSurface),
                        ),
                        Text(
                          _timeAgo(checkin.createdAt),
                          style: AppTypography.textTheme.labelSmall?.copyWith(color: cs.onSurfaceVariant),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // ── Foto (se houver) ─────────────────────────
            if (checkin.photos.isNotEmpty)
              AspectRatio(
                aspectRatio: 16 / 9,
                child: CachedNetworkImage(
                  imageUrl: checkin.photos.first,
                  fit: BoxFit.cover,
                ),
              ),

            // ── Café ─────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.cardPadding, vertical: AppSpacing.sm),
              child: GestureDetector(
                onTap: onCoffeeTap,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      checkin.coffee.name,
                      style: AppTypography.textTheme.titleMedium?.copyWith(
                        color: cs.primary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      checkin.coffee.roastery.name,
                      style: AppTypography.textTheme.bodySmall?.copyWith(color: cs.secondary),
                    ),
                  ],
                ),
              ),
            ),

            // ── Rating ───────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.cardPadding),
              child: Row(
                children: [
                  StarRating(value: checkin.stars, size: 18),
                  const SizedBox(width: AppSpacing.xs),
                  Text(
                    checkin.stars.toStringAsFixed(1),
                    style: AppTypography.textTheme.labelMedium?.copyWith(color: cs.onSurface),
                  ),
                ],
              ),
            ),

            // ── Descrição ─────────────────────────────────
            if (checkin.description != null && checkin.description!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.cardPadding, AppSpacing.sm, AppSpacing.cardPadding, 0,
                ),
                child: Text(
                  '"${checkin.description}"',
                  style: AppTypography.textTheme.bodySmall?.copyWith(
                    color: cs.onSurfaceVariant,
                    fontStyle: FontStyle.italic,
                  ),
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
              ),

            // ── Footer (método + local) ───────────────────
            Padding(
              padding: const EdgeInsets.all(AppSpacing.cardPadding),
              child: Row(
                children: [
                  if (checkin.brewMethod != null) ...[
                    Icon(Icons.local_cafe_outlined, size: 14, color: cs.onSurfaceVariant),
                    const SizedBox(width: 4),
                    Text(
                      checkin.brewMethod!,
                      style: AppTypography.textTheme.labelSmall?.copyWith(color: cs.onSurfaceVariant),
                    ),
                    const SizedBox(width: AppSpacing.md),
                  ],
                  if (checkin.locationName != null) ...[
                    Icon(Icons.place_outlined, size: 14, color: cs.onSurfaceVariant),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        checkin.locationName!,
                        style: AppTypography.textTheme.labelSmall?.copyWith(color: cs.onSurfaceVariant),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'agora';
    if (diff.inMinutes < 60) return '${diff.inMinutes}min';
    if (diff.inHours < 24) return '${diff.inHours}h';
    if (diff.inDays < 7) return '${diff.inDays}d';
    return DateFormat('d MMM', 'pt_BR').format(dt);
  }
}

class _Avatar extends StatelessWidget {
  final dynamic user;
  const _Avatar({required this.user});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return CircleAvatar(
      radius: 20,
      backgroundColor: cs.primaryContainer,
      backgroundImage: user.avatarUrl != null ? NetworkImage(user.avatarUrl as String) : null,
      child: user.avatarUrl == null
          ? Text(
              (user.displayName as String)[0].toUpperCase(),
              style: TextStyle(color: cs.onPrimaryContainer, fontWeight: FontWeight.w600),
            )
          : null,
    );
  }
}
