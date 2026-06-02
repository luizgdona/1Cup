import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_typography.dart';
import '../../../core/network/api_client.dart';

class SuggestEditScreen extends ConsumerStatefulWidget {
  final String coffeeId;
  final String coffeeName;

  const SuggestEditScreen({
    super.key,
    required this.coffeeId,
    required this.coffeeName,
  });

  @override
  ConsumerState<SuggestEditScreen> createState() => _SuggestEditScreenState();
}

class _SuggestEditScreenState extends ConsumerState<SuggestEditScreen> {
  final _formKey = GlobalKey<FormState>();
  final Map<String, TextEditingController> _controllers = {};
  bool _loading = false;

  static const _editableFields = [
    ('name', 'Nome'),
    ('variety', 'Variedade'),
    ('processMethod', 'Processo'),
    ('tastingNotes', 'Notas sensoriais (vírgula)'),
    ('brewMethods', 'Métodos indicados (vírgula)'),
  ];

  @override
  void initState() {
    super.initState();
    for (final f in _editableFields) {
      _controllers[f.$1] = TextEditingController();
    }
  }

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final payload = <String, dynamic>{};
    for (final f in _editableFields) {
      final v = _controllers[f.$1]!.text.trim();
      if (v.isEmpty) continue;
      if (f.$1 == 'tastingNotes' || f.$1 == 'brewMethods') {
        payload[f.$1] = v.split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).toList();
      } else {
        payload[f.$1] = v;
      }
    }

    if (payload.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Preencha ao menos um campo.')),
      );
      return;
    }

    setState(() => _loading = true);
    try {
      await ApiClient.instance.post(
        '/coffees/${widget.coffeeId}/suggestions',
        data: {'payload': payload},
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Sugestão enviada! Obrigado.')),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro ao enviar: $e'),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: Text('Sugerir edição')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.pagePadding),
          children: [
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: cs.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, size: 18, color: cs.primary),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      'Preencha apenas os campos que deseja corrigir em "${widget.coffeeName}". Um admin revisará antes de aplicar.',
                      style: AppTypography.textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            ...(_editableFields.map((f) => Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextFormField(
                      controller: _controllers[f.$1],
                      decoration: InputDecoration(
                        labelText: f.$2,
                        hintText: f.$1 == 'tastingNotes' || f.$1 == 'brewMethods'
                            ? 'ex: Ameixa, Chocolate, Mel'
                            : null,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                  ],
                ))),
            const SizedBox(height: AppSpacing.md),
            FilledButton(
              onPressed: _loading ? null : _submit,
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppSpacing.radiusLg)),
              ),
              child: _loading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Enviar sugestão'),
            ),
            const SizedBox(height: AppSpacing.xxxl),
          ],
        ),
      ),
    );
  }
}
