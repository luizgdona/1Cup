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
import '../../features/feed/presentation/feed_screen.dart';
import '../../features/checkin/presentation/checkin_screen.dart';
import '../../features/checkin/presentation/checkin_detail_screen.dart';
import '../scaffold/main_scaffold.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authListenable = _AuthListenable(ref);

  return GoRouter(
    refreshListenable: authListenable,
    redirect: (context, state) {
      final isAuth = ref.read(isAuthenticatedProvider);
      final authRoutes = {'/login', '/register'};
      final isAuthRoute = authRoutes.contains(state.matchedLocation);
      if (!isAuth && !isAuthRoute) return '/login';
      if (isAuth && isAuthRoute) return '/feed';
      return null;
    },
    routes: [
      // Auth
      GoRoute(path: '/login',    builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),

      // Shell com bottom nav
      ShellRoute(
        builder: (_, state, child) => MainScaffold(child: child),
        routes: [
          GoRoute(path: '/feed',     builder: (_, __) => const FeedScreen()),
          GoRoute(path: '/discover', builder: (_, __) => const DiscoverScreen()),
          GoRoute(path: '/profile',  builder: (_, __) => const ProfileScreen()),
        ],
      ),

      // Check-in
      GoRoute(
        path: '/checkin/new',
        builder: (_, state) => CheckinScreen(
          preselectedCoffeeId: state.uri.queryParameters['coffeeId'],
        ),
      ),
      GoRoute(
        path: '/checkins/:id',
        builder: (_, state) => CheckinDetailScreen(checkinId: state.pathParameters['id']!),
      ),

      // Catálogo
      GoRoute(path: '/coffees/new', builder: (_, __) => const AddCoffeeScreen()),
      GoRoute(
        path: '/coffees/:id',
        builder: (_, state) => CoffeeDetailScreen(coffeeId: state.pathParameters['id']!),
      ),
    ],
    initialLocation: '/login',
  );
});

class _AuthListenable extends ChangeNotifier {
  _AuthListenable(Ref ref) {
    ref.listen(authProvider, (_, __) => notifyListeners());
  }
}
