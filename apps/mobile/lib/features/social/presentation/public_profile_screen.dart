import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_typography.dart';
import '../../../shared/models/user_model.dart';
import '../../auth/domain/auth_provider.dart';
import '../data/friends_repository.dart';
import '../domain/friends_provider.dart';

// Provider para buscar um perfil por username
final _publicProfileProvider = FutureProvider.autoDispose.family<UserModel, String>((ref, username) async {
  final res = await ref.read(friendsRepositoryProvider)._rawGet('/users/$username');
  return UserModel.fromJson((res as Map<String, dynamic>)['data'] as Map<String, dynamic>);
});

class PublicProfileScreen extends ConsumerWidget {
  final String username;
  const PublicProfileScreen({super.key, required this.username});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userAsync = ref.watch(_publicProfileProvider(username));
    final me = ref.watch(authProvider).valueOrNull;

    return userAsync.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (e, _) => Scaffold(body: Center(child: Text('Erro: $e'))),
      data: (user) {
        final isSelf = me?.username == user.username;
        return Scaffold(
          appBar: AppBar(
            title: Text('@${user.username}'),
            actions: [
              IconButton(
                icon: const Icon(Icons.search),
                onPressed: () => context.push('/users/search'),
              ),
            ],
          ),
          body: ListView(
            children: [
              _ProfileHeader(user: user, isSelf: isSelf),
              const Divider(height: 1),
              Padding(
                padding: const EdgeInsets.fromLTRB(
                    AppSpacing.pagePadding, AppSpacing.lg, AppSpacing.pagePadding, AppSpacing.sm),
                child: Text(
                  'Check-ins recentes',
                  style: AppTypography.textTheme.titleSmall?.copyWith(
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
              ),
              _UserCheckinsList(username: username),
              const SizedBox(height: AppSpacing.xxxl),
            ],
          ),
        );
      },
    );
  }
}

class _ProfileHeader extends ConsumerWidget {
  final UserModel user;
  final bool isSelf;
  const _ProfileHeader({required this.user, required this.isSelf});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cs = Theme.of(context).colorScheme;

    return Padding(
      padding: const EdgeInsets.all(AppSpacing.xl),
      child: Column(
        children: [
          CircleAvatar(
            radius: 48,
            backgroundColor: cs.primaryContainer,
            backgroundImage: user.avatarUrl != null ? NetworkImage(user.avatarUrl!) : null,
            child: user.avatarUrl == null
                ? Text(
                    user.displayName[0].toUpperCase(),
                    style: AppTypography.textTheme.headlineLarge?.copyWith(color: cs.onPrimaryContainer),
                  )
                : null,
          ),
          const SizedBox(height: AppSpacing.md),
          Text(user.displayName, style: AppTypography.textTheme.titleLarge),
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
          if (!isSelf) _FriendButton(userId: user.id),
        ],
      ),
    );
  }
}

class _FriendButton extends ConsumerWidget {
  final String userId;
  const _FriendButton({required this.userId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statusAsync = ref.watch(friendshipStatusProvider(userId));
    final repo = ref.read(friendsRepositoryProvider);

    return statusAsync.when(
      loading: () => const SizedBox(height: 40, width: 140, child: LinearProgressIndicator()),
      error: (_, __) => const SizedBox.shrink(),
      data: (status) => switch (status) {
        FriendshipStatus.friends => OutlinedButton.icon(
            onPressed: () async {
              await repo.removeFriend(userId);
              ref.invalidate(friendshipStatusProvider(userId));
              ref.invalidate(friendsProvider);
            },
            icon: const Icon(Icons.person_remove_outlined, size: 18),
            label: const Text('Amigos'),
          ),
        FriendshipStatus.pendingSent => OutlinedButton.icon(
            onPressed: null,
            icon: const Icon(Icons.hourglass_top_outlined, size: 18),
            label: const Text('Enviado'),
          ),
        FriendshipStatus.pendingReceived => FilledButton.icon(
            onPressed: () async {
              await repo.acceptRequest(userId);
              ref.invalidate(friendshipStatusProvider(userId));
              ref.invalidate(friendsProvider);
              ref.invalidate(friendRequestsProvider);
            },
            icon: const Icon(Icons.person_add_outlined, size: 18),
            label: const Text('Aceitar'),
          ),
        FriendshipStatus.none => FilledButton.icon(
            onPressed: () async {
              await repo.sendRequest(userId);
              ref.invalidate(friendshipStatusProvider(userId));
            },
            icon: const Icon(Icons.person_add_outlined, size: 18),
            label: const Text('Seguir'),
          ),
      },
    );
  }
}

class _UserCheckinsList extends ConsumerWidget {
  final String username;
  const _UserCheckinsList({required this.username});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final checkinsAsync = ref.watch(_userCheckinsProvider(username));
    final cs = Theme.of(context).colorScheme;

    return checkinsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (_, __) => const SizedBox.shrink(),
      data: (list) {
        if (list.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.xl),
              child: Text(
                'Nenhum check-in público ainda.',
                style: AppTypography.textTheme.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
              ),
            ),
          );
        }
        return ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.pagePadding),
          itemCount: list.length,
          separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
          itemBuilder: (_, i) {
            final d = list[i];
            return Card(
              child: ListTile(
                leading: const Icon(Icons.coffee),
                title: Text((d['coffee']?['name'] ?? '') as String),
                subtitle: Text((d['coffee']?['roastery']?['name'] ?? '') as String),
              ),
            );
          },
        );
      },
    );
  }
}

final _userCheckinsProvider =
    FutureProvider.autoDispose.family<List<Map<String, dynamic>>, String>((ref, username) async {
  final res = await ref.read(friendsRepositoryProvider)._rawGet('/users/$username/checkins?perPage=5');
  final data = (res as Map<String, dynamic>)['data'] as List?;
  return data?.cast<Map<String, dynamic>>() ?? [];
});
