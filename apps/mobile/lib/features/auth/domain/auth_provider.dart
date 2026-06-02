import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/storage/secure_storage.dart';
import '../../../shared/models/user_model.dart';
import '../data/auth_repository.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) => AuthRepository());

// Estado do usuário logado (null = não autenticado)
final authProvider = AsyncNotifierProvider<AuthNotifier, UserModel?>(AuthNotifier.new);

class AuthNotifier extends AsyncNotifier<UserModel?> {
  late AuthRepository _repo;

  @override
  Future<UserModel?> build() async {
    _repo = ref.read(authRepositoryProvider);
    return _tryRestoreSession();
  }

  Future<UserModel?> _tryRestoreSession() async {
    final token = await SecureStorage.getAccessToken();
    if (token == null) return null;
    try {
      return await _repo.getMe();
    } catch (_) {
      await SecureStorage.clearTokens();
      return null;
    }
  }

  Future<void> login(String email, String password) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _repo.login(email: email, password: password));
  }

  Future<void> register(String username, String email, String password, String displayName) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => _repo.register(
        username: username,
        email: email,
        password: password,
        displayName: displayName,
      ),
    );
  }

  Future<void> logout() async {
    await _repo.logout();
    state = const AsyncData(null);
  }
}

// Conveniência: retorna true se autenticado
final isAuthenticatedProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).valueOrNull != null;
});
