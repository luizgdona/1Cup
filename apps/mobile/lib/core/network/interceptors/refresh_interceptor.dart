import 'package:dio/dio.dart';
import '../../storage/secure_storage.dart';
import '../api_client.dart';

/// Intercepta respostas 401 e tenta renovar o access token automaticamente.
/// Se o refresh também falhar, limpa os tokens (força novo login).
class RefreshInterceptor extends Interceptor {
  final Dio _dio;
  bool _isRefreshing = false;

  RefreshInterceptor(this._dio);

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final response = err.response;

    // Só tenta refresh se recebeu 401 e não é a própria rota de refresh
    if (response?.statusCode != 401 ||
        (response?.requestOptions.path.contains('/auth/refresh') ?? false)) {
      return handler.next(err);
    }

    if (_isRefreshing) return handler.next(err);
    _isRefreshing = true;

    try {
      final refreshToken = await SecureStorage.getRefreshToken();
      if (refreshToken == null) {
        await SecureStorage.clearTokens();
        return handler.next(err);
      }

      // Usa um Dio limpo (sem interceptors) para evitar loop
      final refreshDio = Dio(BaseOptions(baseUrl: _dio.options.baseUrl));
      final res = await refreshDio.post('/auth/refresh', data: {'refreshToken': refreshToken});

      final data = res.data['data'];
      await SecureStorage.saveTokens(
        accessToken: data['accessToken'] as String,
        refreshToken: data['refreshToken'] as String,
      );

      // Repete a requisição original com o novo token
      final options = err.requestOptions;
      options.headers['Authorization'] = 'Bearer ${data['accessToken']}';
      final retry = await _dio.fetch(options);
      return handler.resolve(retry);
    } catch (_) {
      await SecureStorage.clearTokens();
      return handler.next(err);
    } finally {
      _isRefreshing = false;
    }
  }
}
