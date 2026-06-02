import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_typography.dart';
import '../../../shared/widgets/coffee_card.dart';
import '../domain/catalog_provider.dart';

class DiscoverScreen extends ConsumerStatefulWidget {
  const DiscoverScreen({super.key});

  @override
  ConsumerState<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends ConsumerState<DiscoverScreen> {
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final coffeesAsync = ref.watch(coffeesProvider);
    final roastFilter = ref.watch(coffeeRoastFilterProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Descobrir'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_rounded),
            tooltip: 'Cadastrar café',
            onPressed: () => context.push('/coffees/new'),
          ),
        ],
      ),
      body: Column(
        children: [
          // ── Barra de busca ─────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.pagePadding, AppSpacing.sm, AppSpacing.pagePadding, 0,
            ),
            child: SearchBar(
              controller: _searchCtrl,
              hintText: 'Buscar café, torrefação, variedade...',
              leading: const Icon(Icons.search),
              trailing: [
                if (_searchCtrl.text.isNotEmpty)
                  IconButton(
                    icon: const Icon(Icons.clear),
                    onPressed: () {
                      _searchCtrl.clear();
                      ref.read(coffeeSearchQueryProvider.notifier).state = '';
                    },
                  ),
              ],
              onChanged: (v) => ref.read(coffeeSearchQueryProvider.notifier).state = v,
            ),
          ),

          // ── Filtro de torra ───────────────────────────
          SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.pagePadding, vertical: AppSpacing.sm),
              children: [
                _FilterChip(label: 'Todos', value: null, current: roastFilter),
                _FilterChip(label: 'Clara', value: 'LIGHT', current: roastFilter),
                _FilterChip(label: 'Média', value: 'MEDIUM', current: roastFilter),
                _FilterChip(label: 'Escura', value: 'DARK', current: roastFilter),
              ],
            ),
          ),

          // ── Lista ─────────────────────────────────────
          Expanded(
            child: coffeesAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.error_outline, size: 48, color: cs.error),
                    const SizedBox(height: AppSpacing.md),
                    Text('Erro ao carregar cafés', style: AppTypography.textTheme.bodyMedium),
                    TextButton(
                      onPressed: () => ref.invalidate(coffeesProvider),
                      child: const Text('Tentar novamente'),
                    ),
                  ],
                ),
              ),
              data: (coffees) {
                if (coffees.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.coffee_outlined, size: 64, color: cs.outlineVariant),
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          'Nenhum café encontrado.',
                          style: AppTypography.textTheme.bodyMedium?.copyWith(
                            color: cs.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        FilledButton.tonal(
                          onPressed: () => context.push('/coffees/new'),
                          child: const Text('Cadastrar o primeiro'),
                        ),
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(coffeesProvider),
                  child: ListView.separated(
                    padding: const EdgeInsets.all(AppSpacing.pagePadding),
                    itemCount: coffees.length,
                    separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                    itemBuilder: (_, i) => CoffeeCard(
                      coffee: coffees[i],
                      onTap: () => context.push('/coffees/${coffees[i].id}'),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends ConsumerWidget {
  final String label;
  final String? value;
  final String? current;
  const _FilterChip({required this.label, required this.value, required this.current});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = current == value;
    return Padding(
      padding: const EdgeInsets.only(right: AppSpacing.sm),
      child: FilterChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => ref.read(coffeeRoastFilterProvider.notifier).state = value,
      ),
    );
  }
}
