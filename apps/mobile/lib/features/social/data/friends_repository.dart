import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';
import '../../../shared/models/user_model.dart';

enum FriendshipStatus { none, friends, pendingSent, pendingReceived }

class FriendsRepository {
  final Dio _dio = ApiClient.instance;

  Future<List<UserModel>> listFriends() async {
    final res = await _dio.get('/friends');
    return (res.data['data'] as List)
        .map((e) => UserModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Map<String, List<UserModel>>> listRequests() async {
    final res = await _dio.get('/friends/requests');
    final data = res.data['data'] as Map<String, dynamic>;
    return {
      'received': (data['received'] as List)
          .map((e) => UserModel.fromJson(e as Map<String, dynamic>))
          .toList(),
      'sent': (data['sent'] as List)
          .map((e) => UserModel.fromJson(e as Map<String, dynamic>))
          .toList(),
    };
  }

  Future<List<UserModel>> searchUsers(String q) async {
    final res = await _dio.get('/friends/search', queryParameters: {'q': q});
    return (res.data['data'] as List)
        .map((e) => UserModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<FriendshipStatus> getStatus(String userId) async {
    final res = await _dio.get('/friends/status/$userId');
    return _parseStatus(res.data['data']['status'] as String);
  }

  Future<void> sendRequest(String userId) => _dio.post('/friends/request/$userId');

  Future<void> acceptRequest(String userId) =>
      _dio.patch('/friends/request/$userId', data: {'action': 'accept'});

  Future<void> rejectRequest(String userId) =>
      _dio.patch('/friends/request/$userId', data: {'action': 'reject'});

  Future<void> removeFriend(String userId) => _dio.delete('/friends/$userId');

  /// Generic GET — used by public profile providers
  Future<dynamic> rawGet(String path) async {
    final res = await _dio.get(path);
    return res.data;
  }

  FriendshipStatus _parseStatus(String s) => switch (s) {
        'friends' => FriendshipStatus.friends,
        'pending_sent' => FriendshipStatus.pendingSent,
        'pending_received' => FriendshipStatus.pendingReceived,
        _ => FriendshipStatus.none,
      };
}
