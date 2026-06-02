import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_typography.dart';
import '../data/friends_repository.dart';
import '../domain/friends_provider.dart';

class FriendRequestsScreen extends ConsumerWidget {
  const FriendRequestsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final requestsAsync = ref.watch(friendRequestsProvider);
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Solicitações')),
      body: requestsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Erro: $e')),
        data: (data) {
          final received = data['received'] ?? [];
          final sent = data['sent'] ?? [];

          if (received.isEmpty && sent.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.mark_email_read_outlined, size: 64, color: cs.outlineVariant),
                  const SizedBox(height: AppSpacing.md),
                  Text('Nenhuma solicitação pendente.',
                      style: AppTypography.textTheme.bodyMedium?.copyWith(color: cs.onSurfaceVariant)),
                ],
              ),
            );
          }

          return ListView(
            children: [
              if (received.isNotEmpty) ...[
                _SectionHeader('Recebidas (${received.length})'),
                ...received.map((u) => _RequestTile(
                      user: u,
                      isReceived: true,
                      onTap: () => context.push('/users/${u.username}'),
                      onAccept: () async {
                        await ref.read(friendsRepositoryProvider).acceptRequest(u.id);
                        ref.invalidate(friendRequestsProvider);
                        ref.invalidate(friendsProvider);
                      },
                      onReject: () async {
                        await ref.read(friendsRepositoryProvider).rejectRequest(u.id);
                        ref.invalidate(friendRequestsProvider);
                      },
                    )),
              ],
              if (sent.isNotEmpty) ...[
                _SectionHeader('Enviadas (${sent.length})'),
                ...sent.map((u) => _RequestTile(
                      user: u,
                      isReceived: false,
                      onTap: () => context.push('/users/${u.username}'),
                    )),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader(this.title);

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(AppSpacing.pagePadding, AppSpacing.lg, AppSpacing.pagePadding, AppSpacing.xs),
        child: Text(
          title,
          style: AppTypography.textTheme.labelLarge?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      );
}

class _RequestTile extends StatelessWidget {
  final dynamic user;
  final bool isReceived;
  final VoidCallback onTap;
  final VoidCallback? onAccept;
  final VoidCallback? onReject;

  const _RequestTile({
    required this.user,
    required this.isReceived,
    required this.onTap,
    this.onAccept,
    this.onReject,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return ListTile(
      leading: CircleAvatar(
        backgroundColor: cs.primaryContainer,
        backgroundImage: user.avatarUrl != null ? NetworkImage(user.avatarUrl as String) : null,
        child: user.avatarUrl == null
            ? Text((user.displayName as String)[0], style: TextStyle(color: cs.onPrimaryContainer))
            : null,
      ),
      title: Text(user.displayName as String),
      subtitle: Text('@${user.username}'),
      trailing: isReceived
          ? Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: Icon(Icons.close, color: cs.error),
                  onPressed: onReject,
                  tooltip: 'Rejeitar',
                ),
                FilledButton(
                  onPressed: onAccept,
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                  ),
                  child: const Text('Aceitar'),
                ),
              ],
            )
          : Chip(
              label: const Text('Pendente'),
              backgroundColor: cs.surfaceContainerHighest,
            ),
      onTap: onTap,
    );
  }
}
