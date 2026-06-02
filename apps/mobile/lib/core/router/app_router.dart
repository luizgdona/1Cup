import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/domain/auth_provider.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/register_screen.dart';
import '../../features/profile/presentation/profile_screen.dart';
import '../../features/discover/presentation/discover_screen.dart';
import '../../features/discover/presentation/coffee_detail_screen.dart';
import '../../features/discover/presentation/add_coffee_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authListenable = _AuthListenable(ref);

  return GoRouter(
    refreshListenable: authListenable,
    redirect: (context, state) {
      final isAuth = ref.read(isAuthenticatedProvider);
      final authRoutes = {'/login', '/register'};
      final isAuthRoute = authRoutes.contains(state.matchedLocation);

      if (!isAuth && !isAuthRoute) return '/login';
      if (isAuth && isAuthRoute) return '/discover';
      return null;
    },
    routes: [
      // Auth
      GoRoute(path: '/login',    builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),

      // Main
      GoRoute(path: '/discover', builder: (_, __) => const DiscoverScreen()),
      GoRoute(path: '/profile',  builder: (_, __) => const ProfileScreen()),

      // Catálogo
      GoRoute(
        path: '/coffees/:id',
        builder: (_, state) => CoffeeDetailScreen(coffeeId: state.pathParameters['id']!),
      ),
      GoRoute(path: '/coffees/new', builder: (_, __) => const AddCoffeeScreen()),
    ],
    initialLocation: '/login',
  );
});

class _AuthListenable extends ChangeNotifier {
  _AuthListenable(Ref ref) {
    ref.listen(authProvider, (_, __) => notifyListeners());
  }
}
