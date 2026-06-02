import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_typography.dart';
import '../data/friends_repository.dart';
import '../domain/friends_provider.dart';

class UserSearchScreen extends ConsumerStatefulWidget {
  const UserSearchScreen({super.key});

  @override
  ConsumerState<UserSearchScreen> createState() => _UserSearchScreenState();
}

class _UserSearchScreenState extends ConsumerState<UserSearchScreen> {
  final _ctrl = TextEditingController();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final usersAsync = ref.watch(userSearchProvider);

    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _ctrl,
          autofocus: true,
          decoration: InputDecoration(
            hintText: 'Buscar usuários...',
            border: InputBorder.none,
            hintStyle: TextStyle(color: cs.onSurfaceVariant),
          ),
          style: AppTypography.textTheme.bodyLarge,
          onChanged: (v) => ref.read(userSearchQueryProvider.notifier).state = v,
        ),
        actions: [
          if (_ctrl.text.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.clear),
              onPressed: () {
                _ctrl.clear();
                ref.read(userSearchQueryProvider.notifier).state = '';
              },
            ),
        ],
      ),
      body: usersAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Erro: $e')),
        data: (users) {
          if (ref.read(userSearchQueryProvider).length < 2) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.search, size: 64, color: cs.outlineVariant),
                  const SizedBox(height: AppSpacing.md),
                  Text('Digite ao menos 2 caracteres',
                      style: AppTypography.textTheme.bodyMedium?.copyWith(color: cs.onSurfaceVariant)),
                ],
              ),
            );
          }
          if (users.isEmpty) {
            return Center(
              child: Text('Nenhum usuário encontrado.',
                  style: AppTypography.textTheme.bodyMedium?.copyWith(color: cs.onSurfaceVariant)),
            );
          }
          return ListView.builder(
            itemCount: users.length,
            itemBuilder: (_, i) {
              final u = users[i];
              return _UserTile(user: u, onTap: () => context.push('/users/${u.username}'));
            },
          );
        },
      ),
    );
  }
}

class _UserTile extends ConsumerWidget {
  final dynamic user;
  final VoidCallback onTap;
  const _UserTile({required this.user, required this.onTap});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cs = Theme.of(context).colorScheme;
    final statusAsync = ref.watch(friendshipStatusProvider(user.id as String));

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
      trailing: statusAsync.when(
        loading: () => const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
        error: (_, __) => const SizedBox.shrink(),
        data: (status) => _ActionButton(userId: user.id as String, status: status),
      ),
      onTap: onTap,
    );
  }
}

class _ActionButton extends ConsumerWidget {
  final String userId;
  final FriendshipStatus status;
  const _ActionButton({required this.userId, required this.status});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repo = ref.read(friendsRepositoryProvider);

    return switch (status) {
      FriendshipStatus.friends => OutlinedButton(
          onPressed: () async {
            await repo.removeFriend(userId);
            ref.invalidate(friendshipStatusProvider(userId));
          },
          child: const Text('Amigos'),
        ),
      FriendshipStatus.pendingSent => OutlinedButton(
          onPressed: null,
          child: const Text('Enviado'),
        ),
      FriendshipStatus.pendingReceived => FilledButton(
          onPressed: () async {
            await repo.acceptRequest(userId);
            ref.invalidate(friendshipStatusProvider(userId));
            ref.invalidate(friendsProvider);
            ref.invalidate(friendRequestsProvider);
          },
          child: const Text('Aceitar'),
        ),
      FriendshipStatus.none => FilledButton(
          onPressed: () async {
            await repo.sendRequest(userId);
            ref.invalidate(friendshipStatusProvider(userId));
          },
          child: const Text('Seguir'),
        ),
    };
  }
}
