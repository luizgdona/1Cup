import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_typography.dart';
import '../data/admin_repository.dart';
import '../domain/admin_provider.dart';

class SuggestionDetailScreen extends ConsumerStatefulWidget {
  final String suggestionId;
  const SuggestionDetailScreen({super.key, required this.suggestionId});

  @override
  ConsumerState<SuggestionDetailScreen> createState() => _SuggestionDetailScreenState();
}

class _SuggestionDetailScreenState extends ConsumerState<SuggestionDetailScreen> {
  final _noteCtrl = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _noteCtrl.dispose();
    super.dispose();
  }

  Future<void> _review(String action) async {
    setState(() => _loading = true);
    try {
      await ref.read(adminRepositoryProvider).reviewSuggestion(
            widget.suggestionId,
            action: action,
            note: _noteCtrl.text.trim(),
          );
      ref.invalidate(pendingSuggestionsProvider);
      ref.invalidate(adminMetricsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(action == 'approve' ? 'Sugestão aprovada!' : 'Sugestão rejeitada.'),
        ));
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Erro: $e'),
          backgroundColor: Theme.of(context).colorScheme.error,
        ));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final suggestionsAsync = ref.watch(pendingSuggestionsProvider);
    final cs = Theme.of(context).colorScheme;

    final suggestion = suggestionsAsync.valueOrNull
        ?.where((s) => s.id == widget.suggestionId)
        .firstOrNull;

    if (suggestion == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Sugestão')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(title: Text('Sugestão — ${suggestion.entityName}')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.pagePadding),
        children: [
          // ── Info da sugestão ─────────────────────────
          _InfoRow('Entidade', suggestion.entityType),
          _InfoRow('Item', suggestion.entityName),
          _InfoRow('Enviado por', '@${suggestion.user['username']}'),
          _InfoRow('Data', _formatDate(suggestion.createdAt)),

          const Divider(height: AppSpacing.xl),

          // ── Payload (campos sugeridos) ────────────────
          Text('Campos sugeridos',
              style: AppTypography.textTheme.titleSmall?.copyWith(color: cs.primary)),
          const SizedBox(height: AppSpacing.sm),
          ...suggestion.payload.entries.map((e) => _PayloadRow(field: e.key, value: '${e.value}')),

          const SizedBox(height: AppSpacing.xl),

          // ── Nota do revisor ───────────────────────────
          Text('Nota (opcional)',
              style: AppTypography.textTheme.labelLarge?.copyWith(color: cs.onSurfaceVariant)),
          const SizedBox(height: AppSpacing.sm),
          TextFormField(
            controller: _noteCtrl,
            maxLines: 3,
            decoration: const InputDecoration(hintText: 'Motivo da aprovação ou rejeição...'),
          ),

          const SizedBox(height: AppSpacing.xl),

          // ── Ações ─────────────────────────────────────
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _loading ? null : () => _review('reject'),
                  icon: Icon(Icons.close, color: cs.error),
                  label: Text('Rejeitar', style: TextStyle(color: cs.error)),
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(color: cs.error),
                    padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: FilledButton.icon(
                  onPressed: _loading ? null : () => _review('approve'),
                  icon: const Icon(Icons.check),
                  label: const Text('Aprovar'),
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime dt) {
    final d = dt.toLocal();
    return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year} ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  const _InfoRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        children: [
          SizedBox(
            width: 100,
            child: Text(label,
                style: AppTypography.textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
          ),
          Expanded(child: Text(value, style: AppTypography.textTheme.bodySmall)),
        ],
      ),
    );
  }
}

class _PayloadRow extends StatelessWidget {
  final String field;
  final String value;
  const _PayloadRow({required this.field, required this.value});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.xs),
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
      decoration: BoxDecoration(
        color: cs.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(field,
                style: AppTypography.textTheme.labelMedium?.copyWith(
                    color: cs.primary, fontWeight: FontWeight.w600)),
          ),
          Expanded(child: Text(value, style: AppTypography.textTheme.bodySmall)),
        ],
      ),
    );
  }
}
