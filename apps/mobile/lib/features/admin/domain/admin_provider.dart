import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/admin_repository.dart';

final adminRepositoryProvider = Provider<AdminRepository>((ref) => AdminRepository());

final adminMetricsProvider = FutureProvider.autoDispose<AdminMetrics>((ref) {
  return ref.read(adminRepositoryProvider).getMetrics();
});

final pendingSuggestionsProvider = FutureProvider.autoDispose<List<SuggestionModel>>((ref) {
  return ref.read(adminRepositoryProvider).listSuggestions(status: 'PENDING');
});

final adminUserSearchProvider = StateProvider<String>((ref) => '');

final adminUsersProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) {
  final q = ref.watch(adminUserSearchProvider);
  return ref.read(adminRepositoryProvider).listUsers(q: q.isEmpty ? null : q);
});
