import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';
import '../../../shared/models/checkin_model.dart';

class CheckinRepository {
  final Dio _dio = ApiClient.instance;

  Future<CheckinModel> createCheckin({
    required String coffeeId,
    required double stars, // 0.0–5.0
    String? description,
    String? brewMethod,
    double? locationLat,
    double? locationLng,
    String? locationName,
    bool isPublic = true,
  }) async {
    // Converte estrelas para rating interno (0–50)
    final rating = (stars * 10).round();
    final res = await _dio.post('/checkins', data: {
      'coffeeId': coffeeId,
      'rating': rating,
      if (description != null && description.isNotEmpty) 'description': description,
      if (brewMethod != null) 'brewMethod': brewMethod,
      if (locationLat != null) 'locationLat': locationLat,
      if (locationLng != null) 'locationLng': locationLng,
      if (locationName != null) 'locationName': locationName,
      'isPublic': isPublic,
    });
    return CheckinModel.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  Future<CheckinModel> getCheckin(String id) async {
    final res = await _dio.get('/checkins/$id');
    return CheckinModel.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  Future<void> deleteCheckin(String id) => _dio.delete('/checkins/$id');

  Future<({List<CheckinModel> items, String? nextCursor, bool hasMore})> getFeed({
    String? cursor,
  }) async {
    final res = await _dio.get('/feed', queryParameters: {
      if (cursor != null) 'cursor': cursor,
    });
    final list = (res.data['data'] as List)
        .map((e) => CheckinModel.fromJson(e as Map<String, dynamic>))
        .toList();
    return (
      items: list,
      nextCursor: res.data['nextCursor'] as String?,
      hasMore: res.data['hasMore'] as bool? ?? false,
    );
  }

  Future<({List<CheckinModel> items, String? nextCursor, bool hasMore})> getDiscoverFeed({
    String? cursor,
  }) async {
    final res = await _dio.get('/feed/discover', queryParameters: {
      if (cursor != null) 'cursor': cursor,
    });
    final list = (res.data['data'] as List)
        .map((e) => CheckinModel.fromJson(e as Map<String, dynamic>))
        .toList();
    return (
      items: list,
      nextCursor: res.data['nextCursor'] as String?,
      hasMore: res.data['hasMore'] as bool? ?? false,
    );
  }
}
