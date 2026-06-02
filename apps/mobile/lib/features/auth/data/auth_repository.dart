import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_storage.dart';
import '../../../shared/models/user_model.dart';

class AuthRepository {
  final Dio _dio = ApiClient.instance;

  Future<UserModel> register({
    required String username,
    required String email,
    required String password,
    required String displayName,
  }) async {
    final res = await _dio.post('/auth/register', data: {
      'username': username,
      'email': email,
      'password': password,
      'displayName': displayName,
    });
    final data = res.data['data'];
    await SecureStorage.saveTokens(
      accessToken: data['accessToken'] as String,
      refreshToken: data['refreshToken'] as String,
    );
    return UserModel.fromJson(data['user'] as Map<String, dynamic>);
  }

  Future<UserModel> login({
    required String email,
    required String password,
  }) async {
    final res = await _dio.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
    final data = res.data['data'];
    await SecureStorage.saveTokens(
      accessToken: data['accessToken'] as String,
      refreshToken: data['refreshToken'] as String,
    );
    return UserModel.fromJson(data['user'] as Map<String, dynamic>);
  }

  Future<void> logout() async {
    final refreshToken = await SecureStorage.getRefreshToken();
    if (refreshToken != null) {
      try {
        await _dio.post('/auth/logout', data: {'refreshToken': refreshToken});
      } catch (_) {
        // Limpa localmente mesmo que o servidor falhe
      }
    }
    await SecureStorage.clearTokens();
  }

  Future<UserModel> getMe() async {
    final res = await _dio.get('/users/me');
    return UserModel.fromJson(res.data['data'] as Map<String, dynamic>);
  }
}
