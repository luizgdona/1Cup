import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_typography.dart';
import '../../../shared/models/user_model.dart';
import '../../auth/domain/auth_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    return authState.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (e, _) => Scaffold(body: Center(child: Text('Erro: $e'))),
      data: (user) {
        if (user == null) {
          WidgetsBinding.instance.addPostFrameCallback((_) => context.go('/login'));
          return const Scaffold(body: SizedBox.shrink());
        }
        return _ProfileView(user: user);
      },
    );
  }
}

class _ProfileView extends ConsumerWidget {
  final UserModel user;
  const _ProfileView({required this.user});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Text('@${user.username}'),
        actions: [
          if (user.isAdmin)
            IconButton(
              icon: const Icon(Icons.admin_panel_settings_outlined),
              tooltip: 'Painel Admin',
              onPressed: () => context.push('/admin'),
            ),
          IconButton(
            icon: const Icon(Icons.person_search_outlined),
            tooltip: 'Buscar usuários',
            onPressed: () => context.push('/users/search'),
          ),
          IconButton(
            icon: const Icon(Icons.people_outlined),
            tooltip: 'Solicitações',
            onPressed: () => context.push('/friends/requests'),
          ),
          IconButton(
            icon: const Icon(Icons.logout_outlined),
            tooltip: 'Sair',
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // ── Header ──────────────────────────────────────
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppSpacing.xl),
              color: cs.surface,
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 48,
                    backgroundColor: cs.primaryContainer,
                    backgroundImage: user.avatarUrl != null ? NetworkImage(user.avatarUrl!) : null,
                    child: user.avatarUrl == null
                        ? Text(
                            user.displayName[0].toUpperCase(),
                            style: AppTypography.textTheme.headlineLarge?.copyWith(
                              color: cs.onPrimaryContainer,
                            ),
                          )
                        : null,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    user.displayName,
                    style: AppTypography.textTheme.titleLarge?.copyWith(color: cs.onSurface),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    '@${user.username}',
                    style: AppTypography.textTheme.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
                  ),
                  if (user.bio != null && user.bio!.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      user.bio!,
                      textAlign: TextAlign.center,
                      style: AppTypography.textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                    ),
                  ],
                  const SizedBox(height: AppSpacing.lg),
                  // Stats row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _StatColumn(label: 'Check-ins', value: '0'),
                      _Divider(),
                      _StatColumn(label: 'Cafés', value: '0'),
                      _Divider(),
                      _StatColumn(label: 'Badges', value: '0'),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: AppSpacing.sm),

            // ── Tabs placeholder ─────────────────────────────
            DefaultTabController(
              length: 2,
              child: Column(
                children: [
                  TabBar(
                    tabs: const [
                      Tab(text: 'Brewing Journal'),
                      Tab(text: 'Badges'),
                    ],
                    labelColor: cs.primary,
                    unselectedLabelColor: cs.onSurfaceVariant,
                    indicatorColor: cs.primary,
                  ),
                  SizedBox(
                    height: 300,
                    child: TabBarView(
                      children: [
                        _EmptyState(
                          icon: Icons.coffee_outlined,
                          message: 'Ainda sem check-ins.\nFaça o seu primeiro!',
                        ),
                        _EmptyState(
                          icon: Icons.emoji_events_outlined,
                          message: 'Nenhum badge ainda.\nComeçe registrando cafés!',
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatColumn extends StatelessWidget {
  final String label;
  final String value;
  const _StatColumn({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Column(
      children: [
        Text(
          value,
          style: AppTypography.textTheme.titleLarge?.copyWith(
            color: cs.onSurface,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: AppTypography.textTheme.labelSmall?.copyWith(color: cs.onSurfaceVariant),
        ),
      ],
    );
  }
}

class _Divider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 32,
      child: VerticalDivider(color: Theme.of(context).colorScheme.outlineVariant),
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
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 48, color: cs.outlineVariant),
          const SizedBox(height: AppSpacing.md),
          Text(
            message,
            textAlign: TextAlign.center,
            style: AppTypography.textTheme.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}
