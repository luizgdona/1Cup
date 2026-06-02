import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_typography.dart';
import '../../../shared/widgets/checkin_card.dart';
import '../../checkin/domain/checkin_provider.dart';

class FeedScreen extends ConsumerStatefulWidget {
  const FeedScreen({super.key});

  @override
  ConsumerState<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends ConsumerState<FeedScreen> {
  final _scrollCtrl = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollCtrl.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollCtrl.position.pixels >= _scrollCtrl.position.maxScrollExtent - 200) {
      ref.read(feedProvider.notifier).loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final feedAsync = ref.watch(feedProvider);
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Text('☕ 1Cup', style: AppTypography.textTheme.headlineSmall?.copyWith(color: cs.primary)),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {},
          ),
        ],
      ),
      body: feedAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 48, color: cs.error),
              const SizedBox(height: AppSpacing.md),
              Text('Erro ao carregar feed', style: AppTypography.textTheme.bodyMedium),
              TextButton(
                onPressed: () => ref.read(feedProvider.notifier).refresh(),
                child: const Text('Tentar novamente'),
              ),
            ],
          ),
        ),
        data: (feed) {
          if (feed.items.isEmpty) {
            return RefreshIndicator(
              onRefresh: () => ref.read(feedProvider.notifier).refresh(),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: SizedBox(
                  height: MediaQuery.of(context).size.height * 0.7,
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.people_outline, size: 64, color: cs.outlineVariant),
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          'Seu feed está vazio.',
                          style: AppTypography.textTheme.titleMedium?.copyWith(color: cs.onSurface),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          'Adicione amigos ou faça um check-in!',
                          style: AppTypography.textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () => ref.read(feedProvider.notifier).refresh(),
            child: ListView.separated(
              controller: _scrollCtrl,
              padding: const EdgeInsets.all(AppSpacing.pagePadding),
              itemCount: feed.items.length + (feed.isLoadingMore ? 1 : 0),
              separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
              itemBuilder: (_, i) {
                if (i == feed.items.length) {
                  return const Center(
                    child: Padding(
                      padding: EdgeInsets.all(AppSpacing.lg),
                      child: CircularProgressIndicator(),
                    ),
                  );
                }
                final c = feed.items[i];
                return CheckinCard(
                  checkin: c,
                  onTap: () => context.push('/checkins/${c.id}'),
                  onCoffeeTap: () => context.push('/coffees/${c.coffee.id}'),
                ).animate(delay: Duration(milliseconds: (i * 60).clamp(0, 400)))
                    .fadeIn(duration: 300.ms)
                    .slideY(begin: 0.08, curve: Curves.easeOut);
                );
              },
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/checkin/new'),
        tooltip: 'Fazer Check-in',
        child: const Icon(Icons.add),
      ).animate().scale(delay: 600.ms, duration: 400.ms, curve: Curves.elasticOut),
    );
  }
}
