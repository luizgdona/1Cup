import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_typography.dart';
import '../../../shared/models/checkin_model.dart';
import '../../../shared/widgets/star_rating.dart';
import '../data/checkin_repository.dart';

final _checkinDetailProvider = FutureProvider.autoDispose.family<CheckinModel, String>(
  (ref, id) => ref.read(checkinRepositoryProvider).getCheckin(id),
);

class CheckinDetailScreen extends ConsumerWidget {
  final String checkinId;
  const CheckinDetailScreen({super.key, required this.checkinId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_checkinDetailProvider(checkinId));
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Erro: $e')),
        data: (c) => CustomScrollView(
          slivers: [
            SliverAppBar(
              pinned: true,
              expandedHeight: c.photos.isNotEmpty ? 260 : 0,
              flexibleSpace: c.photos.isNotEmpty
                  ? FlexibleSpaceBar(
                      background: CachedNetworkImage(
                        imageUrl: c.photos.first,
                        fit: BoxFit.cover,
                      ),
                    )
                  : null,
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.pagePadding),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ── Usuário ────────────────────────
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 24,
                          backgroundColor: cs.primaryContainer,
                          backgroundImage: c.user.avatarUrl != null
                              ? NetworkImage(c.user.avatarUrl!)
                              : null,
                          child: c.user.avatarUrl == null
                              ? Text(c.user.displayName[0], style: TextStyle(color: cs.onPrimaryContainer))
                              : null,
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(c.user.displayName, style: AppTypography.textTheme.titleSmall),
                            Text(
                              DateFormat("d 'de' MMMM, HH:mm", 'pt_BR').format(c.createdAt.toLocal()),
                              style: AppTypography.textTheme.labelSmall?.copyWith(color: cs.onSurfaceVariant),
                            ),
                          ],
                        ),
                      ],
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // ── Café ───────────────────────────
                    GestureDetector(
                      onTap: () => context.push('/coffees/${c.coffee.id}'),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            c.coffee.name,
                            style: AppTypography.textTheme.headlineSmall?.copyWith(color: cs.primary),
                          ),
                          Text(
                            c.coffee.roastery.name,
                            style: AppTypography.textTheme.bodyMedium?.copyWith(color: cs.secondary),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: AppSpacing.md),

                    // ── Rating ─────────────────────────
                    Row(
                      children: [
                        StarRating(value: c.stars, size: 28),
                        const SizedBox(width: AppSpacing.sm),
                        Text(
                          c.stars.toStringAsFixed(1),
                          style: AppTypography.textTheme.headlineSmall?.copyWith(
                            color: cs.onSurface,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),

                    if (c.description != null && c.description!.isNotEmpty) ...[
                      const SizedBox(height: AppSpacing.lg),
                      Text(
                        '"${c.description}"',
                        style: AppTypography.textTheme.bodyLarge?.copyWith(
                          fontStyle: FontStyle.italic,
                          color: cs.onSurface,
                        ),
                      ),
                    ],

                    const Divider(height: AppSpacing.xxxl),

                    // ── Detalhes ───────────────────────
                    if (c.brewMethod != null)
                      _Row(Icons.local_cafe_outlined, 'Método', c.brewMethod!),
                    if (c.locationName != null)
                      _Row(Icons.place_outlined, 'Local', c.locationName!),
                    if (c.coffee.variety != null)
                      _Row(Icons.grass_outlined, 'Variedade', c.coffee.variety!),

                    // ── Galeria ────────────────────────
                    if (c.photos.length > 1) ...[
                      const SizedBox(height: AppSpacing.lg),
                      Text('Fotos', style: AppTypography.textTheme.titleSmall?.copyWith(color: cs.primary)),
                      const SizedBox(height: AppSpacing.sm),
                      SizedBox(
                        height: 100,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: c.photos.length,
                          separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.sm),
                          itemBuilder: (_, i) => ClipRRect(
                            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                            child: CachedNetworkImage(
                              imageUrl: c.photos[i],
                              width: 100,
                              height: 100,
                              fit: BoxFit.cover,
                            ),
                          ),
                        ),
                      ),
                    ],

                    const SizedBox(height: AppSpacing.xl),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.tonal(
                        onPressed: () => context.push('/checkin/new?coffeeId=${c.coffee.id}'),
                        child: Text('Fazer check-in neste café'),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xxxl),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _Row(this.icon, this.label, this.value);

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        children: [
          Icon(icon, size: 16, color: cs.onSurfaceVariant),
          const SizedBox(width: AppSpacing.sm),
          Text('$label: ', style: AppTypography.textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
          Expanded(child: Text(value, style: AppTypography.textTheme.bodySmall)),
        ],
      ),
    );
  }
}
