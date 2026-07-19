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
import '../../features/social/presentation/public_profile_screen.dart';
import '../../features/social/presentation/user_search_screen.dart';
import '../../features/social/presentation/friend_requests_screen.dart';
import '../../features/admin/presentation/admin_screen.dart';
import '../../features/admin/presentation/suggestion_detail_screen.dart';
import '../../features/admin/presentation/admin_users_screen.dart';
import '../../features/coffee/presentation/suggest_edit_screen.dart';
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

      // Shell com NavigationBar
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
        pageBuilder: (_, state) => _fadePage(CheckinScreen(
          preselectedCoffeeId: state.uri.queryParameters['coffeeId'],
        )),
      ),
      GoRoute(
        path: '/checkins/:id',
        pageBuilder: (_, state) => _fadePage(CheckinDetailScreen(checkinId: state.pathParameters['id']!)),
      ),

      // Catálogo
      GoRoute(path: '/coffees/new', pageBuilder: (_, __) => _fadePage(const AddCoffeeScreen())),
      GoRoute(
        path: '/coffees/:id',
        pageBuilder: (_, state) => _fadePage(CoffeeDetailScreen(coffeeId: state.pathParameters['id']!)),
      ),

      // Admin (role: ADMIN)
      GoRoute(path: '/admin',         builder: (_, __) => const AdminScreen()),
      GoRoute(path: '/admin/users',   builder: (_, __) => const AdminUsersScreen()),
      GoRoute(
        path: '/admin/suggestions/:id',
        builder: (_, state) => SuggestionDetailScreen(suggestionId: state.pathParameters['id']!),
      ),

      // Sugestão de edição (usuários normais)
      GoRoute(
        path: '/coffees/:id/suggest',
        builder: (_, state) => SuggestEditScreen(
          coffeeId: state.pathParameters['id']!,
          coffeeName: state.uri.queryParameters['name'] ?? '',
        ),
      ),

      // Social
      GoRoute(path: '/users/search',   builder: (_, __) => const UserSearchScreen()),
      GoRoute(path: '/friends/requests', builder: (_, __) => const FriendRequestsScreen()),
      GoRoute(
        path: '/users/:username',
        pageBuilder: (_, state) => _fadePage(PublicProfileScreen(username: state.pathParameters['username']!)),
      ),
    ],
    initialLocation: '/login',
  );
});

/// Shared fade + subtle slide transition for pushed detail screens, so
/// navigation feels smooth rather than a hard cut.
CustomTransitionPage<void> _fadePage(Widget child) {
  return CustomTransitionPage<void>(
    child: child,
    transitionDuration: const Duration(milliseconds: 260),
    reverseTransitionDuration: const Duration(milliseconds: 200),
    transitionsBuilder: (_, animation, __, child) {
      final curved = CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
      return FadeTransition(
        opacity: curved,
        child: SlideTransition(
          position: Tween<Offset>(begin: const Offset(0, 0.03), end: Offset.zero).animate(curved),
          child: child,
        ),
      );
    },
  );
}

class _AuthListenable extends ChangeNotifier {
  _AuthListenable(Ref ref) {
    ref.listen(authProvider, (_, __) => notifyListeners());
  }
}
