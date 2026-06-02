import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_typography.dart';
import '../../../shared/models/coffee_model.dart';
import '../../../shared/widgets/star_rating.dart';
import '../../discover/data/catalog_repository.dart';
import '../../discover/domain/catalog_provider.dart';
import '../data/checkin_repository.dart';
import '../domain/checkin_provider.dart';

class CheckinScreen extends ConsumerStatefulWidget {
  /// Se passado, pula a etapa de seleção de café
  final String? preselectedCoffeeId;

  const CheckinScreen({super.key, this.preselectedCoffeeId});

  @override
  ConsumerState<CheckinScreen> createState() => _CheckinScreenState();
}

class _CheckinScreenState extends ConsumerState<CheckinScreen> {
  final _descCtrl = TextEditingController();
  final _locationCtrl = TextEditingController();

  CoffeeModel? _coffee;
  double _stars = 0;
  String? _brewMethod;
  bool _isPublic = true;
  bool _loading = false;

  static const _brewOptions = [
    'Espresso', 'V60', 'Aeropress', 'French Press', 'Moka', 'Cold Brew', 'Outro',
  ];

  @override
  void initState() {
    super.initState();
    if (widget.preselectedCoffeeId != null) {
      _loadCoffee(widget.preselectedCoffeeId!);
    }
  }

  @override
  void dispose() {
    _descCtrl.dispose();
    _locationCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadCoffee(String id) async {
    final coffee = await ref.read(catalogRepositoryProvider).getCoffee(id);
    setState(() => _coffee = coffee);
  }

  Future<void> _submit() async {
    if (_coffee == null) {
      _showSnack('Selecione um café.');
      return;
    }
    if (_stars == 0) {
      _showSnack('Dê ao menos meia estrela.');
      return;
    }

    setState(() => _loading = true);
    try {
      final checkin = await ref.read(checkinRepositoryProvider).createCheckin(
            coffeeId: _coffee!.id,
            stars: _stars,
            description: _descCtrl.text.trim().isEmpty ? null : _descCtrl.text.trim(),
            brewMethod: _brewMethod,
            locationName: _locationCtrl.text.trim().isEmpty ? null : _locationCtrl.text.trim(),
            isPublic: _isPublic,
          );
      ref.read(feedProvider.notifier).prependCheckin(checkin);
      if (mounted) {
        _showSnack('Check-in registrado! ☕');
        context.pop();
      }
    } catch (e) {
      if (mounted) _showSnack('Erro: $e', error: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showSnack(String msg, {bool error = false}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: error ? Theme.of(context).colorScheme.error : null,
    ));
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Novo Check-in')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.pagePadding),
        children: [
          // ── Seleção de café ───────────────────────────
          _SectionLabel('Qual café você está bebendo? *'),
          _CoffeeSearchField(
            selected: _coffee,
            onSelected: (c) => setState(() => _coffee = c),
          ),
          const SizedBox(height: AppSpacing.xl),

          // ── Avaliação ─────────────────────────────────
          _SectionLabel('Sua nota *'),
          Center(
            child: StarRatingInput(
              value: _stars,
              size: 44,
              onChanged: (v) => setState(() => _stars = v),
            ),
          ),
          Center(
            child: Text(
              _stars == 0 ? 'Toque para avaliar' : '${_stars.toStringAsFixed(1)} / 5.0',
              style: AppTypography.textTheme.labelMedium?.copyWith(color: cs.onSurfaceVariant),
            ),
          ),
          const SizedBox(height: AppSpacing.xl),

          // ── Descrição sensorial ───────────────────────
          _SectionLabel('Como foi?'),
          TextFormField(
            controller: _descCtrl,
            maxLines: 4,
            maxLength: 500,
            decoration: const InputDecoration(
              hintText: 'Descreva o que sentiu: acidez, corpo, doçura, final...',
            ),
          ),
          const SizedBox(height: AppSpacing.md),

          // ── Método de preparo ─────────────────────────
          _SectionLabel('Método de preparo'),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.xs,
            children: _brewOptions.map((m) {
              final selected = _brewMethod == m;
              return ChoiceChip(
                label: Text(m),
                selected: selected,
                onSelected: (_) => setState(() => _brewMethod = selected ? null : m),
              );
            }).toList(),
          ),
          const SizedBox(height: AppSpacing.md),

          // ── Localização ───────────────────────────────
          _SectionLabel('Onde você está? (opcional)'),
          TextFormField(
            controller: _locationCtrl,
            decoration: const InputDecoration(
              hintText: 'ex: Coffee Lab, São Paulo',
              prefixIcon: Icon(Icons.place_outlined),
            ),
          ),
          const SizedBox(height: AppSpacing.md),

          // ── Visibilidade ──────────────────────────────
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: Text('Compartilhar com amigos', style: AppTypography.textTheme.titleSmall),
            subtitle: Text(
              _isPublic ? 'Aparece no feed dos seus amigos' : 'Visível apenas para você',
              style: AppTypography.textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant),
            ),
            value: _isPublic,
            onChanged: (v) => setState(() => _isPublic = v),
          ),

          const SizedBox(height: AppSpacing.xl),
          FilledButton(
            onPressed: _loading ? null : _submit,
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
              ),
            ),
            child: _loading
                ? const SizedBox(
                    height: 20, width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Text('Registrar Check-in'),
          ),
          const SizedBox(height: AppSpacing.xxxl),
        ],
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

class _CoffeeSearchField extends ConsumerStatefulWidget {
  final CoffeeModel? selected;
  final ValueChanged<CoffeeModel> onSelected;
  const _CoffeeSearchField({required this.selected, required this.onSelected});

  @override
  ConsumerState<_CoffeeSearchField> createState() => _CoffeeSearchFieldState();
}

class _CoffeeSearchFieldState extends ConsumerState<_CoffeeSearchField> {
  @override
  Widget build(BuildContext context) {
    if (widget.selected != null) {
      final c = widget.selected!;
      return ListTile(
        contentPadding: EdgeInsets.zero,
        leading: const Icon(Icons.coffee),
        title: Text(c.name),
        subtitle: Text(c.roastery.name),
        trailing: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () {},
        ),
      );
    }

    return Autocomplete<CoffeeModel>(
      displayStringForOption: (c) => '${c.name} · ${c.roastery.name}',
      optionsBuilder: (v) async {
        if (v.text.length < 2) return const [];
        return ref.read(catalogRepositoryProvider).listCoffees(q: v.text);
      },
      onSelected: widget.onSelected,
      fieldViewBuilder: (_, ctrl, focusNode, __) => TextFormField(
        controller: ctrl,
        focusNode: focusNode,
        decoration: const InputDecoration(
          labelText: 'Buscar café',
          prefixIcon: Icon(Icons.search),
        ),
      ),
      optionsViewBuilder: (_, onSelected, options) => Align(
        alignment: Alignment.topLeft,
        child: Material(
          elevation: 4,
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 220),
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: options.length,
              itemBuilder: (_, i) {
                final c = options.elementAt(i);
                return ListTile(
                  leading: const Icon(Icons.coffee),
                  title: Text(c.name),
                  subtitle: Text(c.roastery.name),
                  onTap: () => onSelected(c),
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}
