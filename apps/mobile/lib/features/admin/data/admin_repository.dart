import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';

class AdminMetrics {
  final int totalUsers;
  final int checkinsToday;
  final int totalCoffees;
  final int pendingSuggestions;

  const AdminMetrics({
    required this.totalUsers,
    required this.checkinsToday,
    required this.totalCoffees,
    required this.pendingSuggestions,
  });

  factory AdminMetrics.fromJson(Map<String, dynamic> j) => AdminMetrics(
        totalUsers: j['totalUsers'] as int,
        checkinsToday: j['checkinsToday'] as int,
        totalCoffees: j['totalCoffees'] as int,
        pendingSuggestions: j['pendingSuggestions'] as int,
      );
}

class SuggestionModel {
  final String id;
  final String entityType;
  final String entityId;
  final String status;
  final Map<String, dynamic> payload;
  final String? reviewNote;
  final DateTime createdAt;
  final Map<String, dynamic> user;
  final Map<String, dynamic>? entity;

  const SuggestionModel({
    required this.id,
    required this.entityType,
    required this.entityId,
    required this.status,
    required this.payload,
    this.reviewNote,
    required this.createdAt,
    required this.user,
    this.entity,
  });

  factory SuggestionModel.fromJson(Map<String, dynamic> j) {
    final entity = (j['coffee'] ?? j['producer'] ?? j['roastery']) as Map<String, dynamic>?;
    return SuggestionModel(
      id: j['id'] as String,
      entityType: j['entityType'] as String,
      entityId: j['entityId'] as String,
      status: j['status'] as String,
      payload: j['payload'] as Map<String, dynamic>,
      reviewNote: j['reviewNote'] as String?,
      createdAt: DateTime.parse(j['createdAt'] as String),
      user: j['user'] as Map<String, dynamic>,
      entity: entity,
    );
  }

  String get entityName => entity?['name'] as String? ?? entityId;
}

class AdminRepository {
  final Dio _dio = ApiClient.instance;

  Future<AdminMetrics> getMetrics() async {
    final res = await _dio.get('/admin/metrics');
    return AdminMetrics.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  Future<List<SuggestionModel>> listSuggestions({String status = 'PENDING', int page = 1}) async {
    final res = await _dio.get('/admin/suggestions', queryParameters: {'status': status, 'page': page});
    return (res.data['data'] as List).map((e) => SuggestionModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> reviewSuggestion(String id, {required String action, String? note}) async {
    await _dio.patch('/admin/suggestions/$id', data: {
      'action': action,
      if (note != null && note.isNotEmpty) 'reviewNote': note,
    });
  }

  Future<List<Map<String, dynamic>>> listUsers({String? q, int page = 1}) async {
    final res = await _dio.get('/admin/users', queryParameters: {
      if (q != null) 'q': q,
      'page': page,
    });
    return (res.data['data'] as List).cast<Map<String, dynamic>>();
  }

  Future<void> updateUserRole(String userId, String role) async {
    await _dio.patch('/admin/users/$userId/role', data: {'role': role});
  }
}
