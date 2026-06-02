import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_typography.dart';
import '../../../shared/models/roastery_model.dart';
import '../data/catalog_repository.dart';
import '../domain/catalog_provider.dart';

class AddCoffeeScreen extends ConsumerStatefulWidget {
  const AddCoffeeScreen({super.key});

  @override
  ConsumerState<AddCoffeeScreen> createState() => _AddCoffeeScreenState();
}

class _AddCoffeeScreenState extends ConsumerState<AddCoffeeScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _varietyCtrl = TextEditingController();
  final _noteCtrl = TextEditingController();

  RoasteryModel? _selectedRoastery;
  String? _roastColor;
  String? _processMethod;
  final List<String> _tastingNotes = [];
  final List<String> _brewMethods = [];
  bool _loading = false;

  static const _roastOptions = [
    ('LIGHT', 'Clara'), ('LIGHT_MEDIUM', 'Clara-Média'),
    ('MEDIUM', 'Média'), ('MEDIUM_DARK', 'Média-Escura'), ('DARK', 'Escura'),
  ];
  static const _processOptions = ['Natural', 'Honey', 'Washed', 'Anaeróbico'];
  static const _brewOptions = ['Espresso', 'V60', 'Aeropress', 'French Press', 'Moka', 'Cold Brew'];

  @override
  void dispose() {
    _nameCtrl.dispose();
    _varietyCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedRoastery == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecione uma torrefação.')),
      );
      return;
    }

    setState(() => _loading = true);
    try {
      await ref.read(catalogRepositoryProvider).createCoffee(
            name: _nameCtrl.text.trim(),
            roasteryId: _selectedRoastery!.id,
            variety: _varietyCtrl.text.trim().isNotEmpty ? _varietyCtrl.text.trim() : null,
            roastColor: _roastColor,
            processMethod: _processMethod,
            tastingNotes: _tastingNotes,
            brewMethods: _brewMethods,
          );
      ref.invalidate(coffeesProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Café cadastrado com sucesso!')),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro: $e'), backgroundColor: Theme.of(context).colorScheme.error),
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
      appBar: AppBar(title: const Text('Cadastrar Café')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.pagePadding),
          children: [
            // ── Nome ──────────────────────────────────
            TextFormField(
              controller: _nameCtrl,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(labelText: 'Nome do café *'),
              validator: (v) => (v == null || v.trim().length < 2) ? 'Nome obrigatório (mín. 2 chars)' : null,
            ),
            const SizedBox(height: AppSpacing.md),

            // ── Torrefação ────────────────────────────
            _SectionLabel('Torrefação *'),
            _RoasteryAutocomplete(
              onSelected: (r) => setState(() => _selectedRoastery = r),
              selected: _selectedRoastery,
            ),
            const SizedBox(height: AppSpacing.md),

            // ── Variedade ─────────────────────────────
            TextFormField(
              controller: _varietyCtrl,
              decoration: const InputDecoration(labelText: 'Variedade', hintText: 'ex: Gesha, Bourbon'),
            ),
            const SizedBox(height: AppSpacing.md),

            // ── Torra ─────────────────────────────────
            _SectionLabel('Torra'),
            Wrap(
              spacing: AppSpacing.sm,
              children: _roastOptions.map((opt) {
                final selected = _roastColor == opt.$1;
                return ChoiceChip(
                  label: Text(opt.$2),
                  selected: selected,
                  onSelected: (_) => setState(() => _roastColor = selected ? null : opt.$1),
                );
              }).toList(),
            ),
            const SizedBox(height: AppSpacing.md),

            // ── Processo ──────────────────────────────
            _SectionLabel('Processo'),
            Wrap(
              spacing: AppSpacing.sm,
              children: _processOptions.map((p) {
                final selected = _processMethod == p;
                return ChoiceChip(
                  label: Text(p),
                  selected: selected,
                  onSelected: (_) => setState(() => _processMethod = selected ? null : p),
                );
              }).toList(),
            ),
            const SizedBox(height: AppSpacing.md),

            // ── Notas sensoriais ──────────────────────
            _SectionLabel('Notas sensoriais'),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _noteCtrl,
                    decoration: const InputDecoration(hintText: 'ex: Ameixa, Chocolate'),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.add_circle_outline),
                  onPressed: () {
                    final v = _noteCtrl.text.trim();
                    if (v.isNotEmpty && !_tastingNotes.contains(v)) {
                      setState(() => _tastingNotes.add(v));
                      _noteCtrl.clear();
                    }
                  },
                ),
              ],
            ),
            if (_tastingNotes.isNotEmpty) ...[
              const SizedBox(height: AppSpacing.sm),
              Wrap(
                spacing: AppSpacing.sm,
                children: _tastingNotes
                    .map((n) => Chip(
                          label: Text(n),
                          deleteIcon: const Icon(Icons.close, size: 16),
                          onDeleted: () => setState(() => _tastingNotes.remove(n)),
                        ))
                    .toList(),
              ),
            ],
            const SizedBox(height: AppSpacing.md),

            // ── Métodos ───────────────────────────────
            _SectionLabel('Métodos indicados'),
            Wrap(
              spacing: AppSpacing.sm,
              children: _brewOptions.map((m) {
                final selected = _brewMethods.contains(m);
                return FilterChip(
                  label: Text(m),
                  selected: selected,
                  onSelected: (v) => setState(
                    () => v ? _brewMethods.add(m) : _brewMethods.remove(m),
                  ),
                );
              }).toList(),
            ),

            const SizedBox(height: AppSpacing.xl),
            FilledButton(
              onPressed: _loading ? null : _submit,
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppSpacing.radiusLg)),
              ),
              child: _loading
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Cadastrar Café'),
            ),
            const SizedBox(height: AppSpacing.xxxl),
          ],
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: AppSpacing.sm),
        child: Text(
          text,
          style: AppTypography.textTheme.labelLarge?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      );
}

// Autocomplete de torrefações com busca live
class _RoasteryAutocomplete extends ConsumerStatefulWidget {
  final RoasteryModel? selected;
  final ValueChanged<RoasteryModel> onSelected;
  const _RoasteryAutocomplete({required this.selected, required this.onSelected});

  @override
  ConsumerState<_RoasteryAutocomplete> createState() => _RoasteryAutocompleteState();
}

class _RoasteryAutocompleteState extends ConsumerState<_RoasteryAutocomplete> {
  final _ctrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    if (widget.selected != null) _ctrl.text = widget.selected!.name;
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Autocomplete<RoasteryModel>(
      displayStringForOption: (r) => r.name,
      optionsBuilder: (v) async {
        if (v.text.isEmpty) return const [];
        return ref.read(catalogRepositoryProvider).listRoasteries(q: v.text);
      },
      onSelected: widget.onSelected,
      fieldViewBuilder: (_, ctrl, focusNode, onSubmit) => TextFormField(
        controller: ctrl,
        focusNode: focusNode,
        decoration: InputDecoration(
          labelText: 'Buscar torrefação',
          suffixIcon: ctrl.text.isNotEmpty
              ? IconButton(icon: const Icon(Icons.clear), onPressed: ctrl.clear)
              : const Icon(Icons.store_outlined),
        ),
      ),
      optionsViewBuilder: (_, onSelected, options) => Align(
        alignment: Alignment.topLeft,
        child: Material(
          elevation: 4,
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 200),
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: options.length,
              itemBuilder: (_, i) {
                final r = options.elementAt(i);
                return ListTile(
                  leading: const Icon(Icons.store_outlined),
                  title: Text(r.name),
                  subtitle: r.location.isNotEmpty ? Text(r.location) : null,
                  onTap: () => onSelected(r),
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}
