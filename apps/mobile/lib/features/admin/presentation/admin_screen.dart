import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_typography.dart';
import '../data/admin_repository.dart';
import '../domain/admin_provider.dart';

class AdminScreen extends ConsumerWidget {
  const AdminScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final metricsAsync = ref.watch(adminMetricsProvider);
    final suggestionsAsync = ref.watch(pendingSuggestionsProvider);
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Painel Admin'),
        actions: [
          IconButton(
            icon: const Icon(Icons.people_outlined),
            tooltip: 'Usuários',
            onPressed: () => context.push('/admin/users'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(adminMetricsProvider);
          ref.invalidate(pendingSuggestionsProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.pagePadding),
          children: [
            // ── Métricas ─────────────────────────────────
            Text('Visão Geral', style: AppTypography.textTheme.titleMedium?.copyWith(color: cs.primary)),
            const SizedBox(height: AppSpacing.sm),
            metricsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Text('Erro: $e'),
              data: (m) => _MetricsGrid(metrics: m),
            ),

            const SizedBox(height: AppSpacing.xl),

            // ── Sugestões pendentes ───────────────────────
            Row(
              children: [
                Text('Sugestões Pendentes', style: AppTypography.textTheme.titleMedium?.copyWith(color: cs.primary)),
                const Spacer(),
                TextButton(
                  onPressed: () => context.push('/admin/suggestions'),
                  child: const Text('Ver todas'),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            suggestionsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Text('Erro: $e'),
              data: (suggestions) {
                if (suggestions.isEmpty) {
                  return _EmptyState(
                    icon: Icons.check_circle_outline,
                    message: 'Nenhuma sugestão pendente.',
                  );
                }
                return Column(
                  children: suggestions
                      .take(5)
                      .map((s) => _SuggestionTile(
                            suggestion: s,
                            onReview: () => context.push('/admin/suggestions/${s.id}'),
                          ))
                      .toList(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

// ── Grid de métricas ──────────────────────────────────────

class _MetricsGrid extends StatelessWidget {
  final AdminMetrics metrics;
  const _MetricsGrid({required this.metrics});

  @override
  Widget build(BuildContext context) => GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        crossAxisSpacing: AppSpacing.sm,
        mainAxisSpacing: AppSpacing.sm,
        childAspectRatio: 1.6,
        children: [
          _MetricCard(label: 'Usuários', value: '${metrics.totalUsers}', icon: Icons.people_outline, color: Colors.blue),
          _MetricCard(label: 'Check-ins hoje', value: '${metrics.checkinsToday}', icon: Icons.coffee_outlined, color: Colors.orange),
          _MetricCard(label: 'Cafés', value: '${metrics.totalCoffees}', icon: Icons.local_cafe_outlined, color: Colors.green),
          _MetricCard(
            label: 'Sugestões',
            value: '${metrics.pendingSuggestions}',
            icon: Icons.pending_actions_outlined,
            color: metrics.pendingSuggestions > 0 ? Colors.red : Colors.grey,
          ),
        ],
      );
}

class _MetricCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  const _MetricCard({required this.label, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: cs.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(AppSpacing.radiusXl),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Icon(icon, color: color, size: 24),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(value,
                  style: AppTypography.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
              Text(label,
                  style: AppTypography.textTheme.labelSmall?.copyWith(color: cs.onSurfaceVariant)),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Tile de sugestão ─────────────────────────────────────

class _SuggestionTile extends StatelessWidget {
  final SuggestionModel suggestion;
  final VoidCallback onReview;
  const _SuggestionTile({required this.suggestion, required this.onReview});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final typeLabel = switch (suggestion.entityType) {
      'COFFEE' => 'Café',
      'PRODUCER' => 'Produtor',
      'ROASTERY' => 'Torrefação',
      _ => suggestion.entityType,
    };

    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: cs.primaryContainer,
          child: Icon(Icons.edit_outlined, color: cs.onPrimaryContainer, size: 18),
        ),
        title: Text(suggestion.entityName, style: AppTypography.textTheme.titleSmall),
        subtitle: Text(
          '$typeLabel · por @${suggestion.user['username']}',
          style: AppTypography.textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant),
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: onReview,
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String message;
  const _EmptyState({required this.icon, required this.message});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xl),
      child: Center(
        child: Column(
          children: [
            Icon(icon, size: 48, color: cs.outlineVariant),
            const SizedBox(height: AppSpacing.sm),
            Text(message,
                style: AppTypography.textTheme.bodyMedium?.copyWith(color: cs.onSurfaceVariant)),
          ],
        ),
      ),
    );
  }
}
