import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_typography.dart';
import '../../../core/constants/app_colors.dart';
import '../domain/catalog_provider.dart';

class CoffeeDetailScreen extends ConsumerWidget {
  final String coffeeId;
  const CoffeeDetailScreen({super.key, required this.coffeeId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final coffeeAsync = ref.watch(coffeeDetailProvider(coffeeId));
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      body: coffeeAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Erro: $e')),
        data: (coffee) => CustomScrollView(
          slivers: [
            // ── App Bar com imagem ─────────────────────
            SliverAppBar(
              expandedHeight: 240,
              pinned: true,
              flexibleSpace: FlexibleSpaceBar(
                title: Text(coffee.name, style: const TextStyle(fontSize: 16)),
                background: coffee.labelImageUrl != null
                    ? CachedNetworkImage(
                        imageUrl: coffee.labelImageUrl!,
                        fit: BoxFit.cover,
                        color: Colors.black26,
                        colorBlendMode: BlendMode.darken,
                      )
                    : Container(
                        color: cs.primaryContainer,
                        child: Icon(Icons.coffee, size: 80, color: cs.onPrimaryContainer),
                      ),
              ),
              actions: [
                IconButton(
                  icon: const Icon(Icons.edit_outlined),
                  tooltip: 'Sugerir edição',
                  onPressed: () => context.push('/coffees/${coffee.id}/suggest?name=${Uri.encodeComponent(coffee.name)}'),
                ),
              ],
            ),

            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.pagePadding),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ── Torrefação ─────────────────────
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: CircleAvatar(
                        backgroundColor: cs.primaryContainer,
                        backgroundImage: coffee.roastery.logoUrl != null
                            ? NetworkImage(coffee.roastery.logoUrl!)
                            : null,
                        child: coffee.roastery.logoUrl == null
                            ? Icon(Icons.store_outlined, color: cs.onPrimaryContainer)
                            : null,
                      ),
                      title: Text(coffee.roastery.name, style: AppTypography.textTheme.titleMedium),
                      subtitle: Text(coffee.roastery.location, style: AppTypography.textTheme.bodySmall),
                    ),

                    const Divider(height: AppSpacing.xl),

                    // ── Estatísticas ───────────────────
                    Row(
                      children: [
                        _StatBox(
                          icon: Icons.star_rounded,
                          iconColor: AppColors.roastedGoldLight,
                          value: coffee.avgRating != null
                              ? coffee.avgRating!.toStringAsFixed(1)
                              : '—',
                          label: 'Média',
                        ),
                        const SizedBox(width: AppSpacing.md),
                        _StatBox(
                          icon: Icons.coffee_outlined,
                          iconColor: cs.primary,
                          value: '${coffee.checkinCount}',
                          label: 'Check-ins',
                        ),
                        if (coffee.scaScore != null) ...[
                          const SizedBox(width: AppSpacing.md),
                          _StatBox(
                            icon: Icons.workspace_premium_outlined,
                            iconColor: cs.tertiary,
                            value: coffee.scaScore!.toStringAsFixed(1),
                            label: 'SCA',
                          ),
                        ],
                      ],
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // ── Detalhes ───────────────────────
                    _SectionTitle('Detalhes'),
                    const SizedBox(height: AppSpacing.sm),
                    _DetailRow('Variedade', coffee.variety),
                    _DetailRow('Torra', coffee.roastLabel.isNotEmpty ? coffee.roastLabel : null),
                    _DetailRow('Processo', coffee.processMethod),
                    if (coffee.producer != null)
                      _DetailRow(
                        'Produtor',
                        '${coffee.producer!.name}${coffee.producer!.farmName != null ? ' · ${coffee.producer!.farmName}' : ''}',
                      ),

                    if (coffee.tastingNotes.isNotEmpty) ...[
                      const SizedBox(height: AppSpacing.lg),
                      _SectionTitle('Notas sensoriais'),
                      const SizedBox(height: AppSpacing.sm),
                      Wrap(
                        spacing: AppSpacing.sm,
                        runSpacing: AppSpacing.xs,
                        children: coffee.tastingNotes
                            .map((n) => Chip(label: Text(n)))
                            .toList(),
                      ),
                    ],

                    if (coffee.brewMethods.isNotEmpty) ...[
                      const SizedBox(height: AppSpacing.lg),
                      _SectionTitle('Métodos indicados'),
                      const SizedBox(height: AppSpacing.sm),
                      Wrap(
                        spacing: AppSpacing.sm,
                        children: coffee.brewMethods
                            .map((m) => Chip(
                                  avatar: const Icon(Icons.local_cafe_outlined, size: 16),
                                  label: Text(m),
                                ))
                            .toList(),
                      ),
                    ],

                    const SizedBox(height: AppSpacing.xl),

                    // ── CTA check-in ───────────────────
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: () {},
                        icon: const Icon(Icons.add_rounded),
                        label: const Text('Fazer Check-in'),
                        style: FilledButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
                          ),
                        ),
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

class _SectionTitle extends StatelessWidget {
  final String title;
  const _SectionTitle(this.title);

  @override
  Widget build(BuildContext context) => Text(
        title,
        style: AppTypography.textTheme.titleSmall?.copyWith(
          color: Theme.of(context).colorScheme.primary,
          fontWeight: FontWeight.w700,
        ),
      );
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String? value;
  const _DetailRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    if (value == null || value!.isEmpty) return const SizedBox.shrink();
    final cs = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 96,
            child: Text(
              label,
              style: AppTypography.textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant),
            ),
          ),
          Expanded(
            child: Text(value!, style: AppTypography.textTheme.bodySmall?.copyWith(color: cs.onSurface)),
          ),
        ],
      ),
    );
  }
}

class _StatBox extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String value;
  final String label;
  const _StatBox({required this.icon, required this.iconColor, required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: cs.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        ),
        child: Column(
          children: [
            Icon(icon, color: iconColor, size: 20),
            const SizedBox(height: 4),
            Text(value, style: AppTypography.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            Text(label, style: AppTypography.textTheme.labelSmall?.copyWith(color: cs.onSurfaceVariant)),
          ],
        ),
      ),
    );
  }
}
