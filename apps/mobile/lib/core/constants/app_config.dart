class AppConfig {
  AppConfig._();

  // Trocar pela URL real de produção antes de buildar release.
  // Nunca colocar secrets aqui — apenas URLs e config não-sensível.
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000/api/v1', // emulador Android → localhost
  );

  static const Duration connectTimeout = Duration(seconds: 10);
  static const Duration receiveTimeout = Duration(seconds: 15);
}
