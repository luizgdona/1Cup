import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/models/user_model.dart';
import '../data/friends_repository.dart';


final friendsRepositoryProvider = Provider<FriendsRepository>((ref) => FriendsRepository());

final friendsProvider = FutureProvider.autoDispose<List<UserModel>>((ref) {
  return ref.read(friendsRepositoryProvider).listFriends();
});

final friendRequestsProvider =
    FutureProvider.autoDispose<Map<String, List<UserModel>>>((ref) {
  return ref.read(friendsRepositoryProvider).listRequests();
});

final friendshipStatusProvider =
    FutureProvider.autoDispose.family<FriendshipStatus, String>((ref, userId) {
  return ref.read(friendsRepositoryProvider).getStatus(userId);
});

final userSearchQueryProvider = StateProvider<String>((ref) => '');

final userSearchProvider = FutureProvider.autoDispose<List<UserModel>>((ref) {
  final q = ref.watch(userSearchQueryProvider);
  if (q.length < 2) return Future.value([]);
  return ref.read(friendsRepositoryProvider).searchUsers(q);
});
