import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_typography.dart';
import '../data/admin_repository.dart';
import '../domain/admin_provider.dart';

class AdminUsersScreen extends ConsumerStatefulWidget {
  const AdminUsersScreen({super.key});

  @override
  ConsumerState<AdminUsersScreen> createState() => _AdminUsersScreenState();
}

class _AdminUsersScreenState extends ConsumerState<AdminUsersScreen> {
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final usersAsync = ref.watch(adminUsersProvider);
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _searchCtrl,
          decoration: InputDecoration(
            hintText: 'Buscar usuário...',
            border: InputBorder.none,
            hintStyle: TextStyle(color: cs.onSurfaceVariant),
          ),
          onChanged: (v) => ref.read(adminUserSearchProvider.notifier).state = v,
        ),
      ),
      body: usersAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Erro: $e')),
        data: (users) {
          if (users.isEmpty) {
            return Center(
              child: Text('Nenhum usuário encontrado.',
                  style: AppTypography.textTheme.bodyMedium?.copyWith(color: cs.onSurfaceVariant)),
            );
          }
          return ListView.builder(
            itemCount: users.length,
            itemBuilder: (_, i) => _UserAdminTile(user: users[i]),
          );
        },
      ),
    );
  }
}

class _UserAdminTile extends ConsumerWidget {
  final Map<String, dynamic> user;
  const _UserAdminTile({required this.user});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cs = Theme.of(context).colorScheme;
    final isAdmin = user['role'] == 'ADMIN';
    final checkins = (user['_count'] as Map<String, dynamic>?)?['checkins'] ?? 0;

    return ListTile(
      leading: CircleAvatar(
        backgroundColor: isAdmin ? cs.primaryContainer : cs.surfaceContainerHighest,
        child: Text(
          (user['displayName'] as String)[0].toUpperCase(),
          style: TextStyle(color: isAdmin ? cs.onPrimaryContainer : cs.onSurfaceVariant),
        ),
      ),
      title: Row(
        children: [
          Text(user['displayName'] as String, style: AppTypography.textTheme.titleSmall),
          if (isAdmin) ...[
            const SizedBox(width: AppSpacing.xs),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
              decoration: BoxDecoration(
                color: cs.primaryContainer,
                borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
              ),
              child: Text('admin',
                  style: TextStyle(fontSize: 10, color: cs.onPrimaryContainer, fontWeight: FontWeight.w600)),
            ),
          ],
        ],
      ),
      subtitle: Text(
        '@${user['username']} · $checkins check-ins',
        style: AppTypography.textTheme.bodySmall?.copyWith(color: cs.onSurfaceVariant),
      ),
      trailing: PopupMenuButton<String>(
        tooltip: 'Ações',
        onSelected: (action) async {
          final repo = ref.read(adminRepositoryProvider);
          if (action == 'make_admin') {
            await repo.updateUserRole(user['id'] as String, 'ADMIN');
          } else if (action == 'make_user') {
            await repo.updateUserRole(user['id'] as String, 'USER');
          }
          ref.invalidate(adminUsersProvider);
        },
        itemBuilder: (_) => [
          if (!isAdmin)
            const PopupMenuItem(value: 'make_admin', child: Text('Promover a Admin')),
          if (isAdmin)
            const PopupMenuItem(value: 'make_user', child: Text('Remover Admin')),
        ],
      ),
    );
  }
}
