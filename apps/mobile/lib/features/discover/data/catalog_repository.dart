import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';
import '../../../shared/models/coffee_model.dart';
import '../../../shared/models/roastery_model.dart';
import '../../../shared/models/producer_model.dart';

class CatalogRepository {
  final Dio _dio = ApiClient.instance;

  // ── Coffees ──────────────────────────────────────────────

  Future<List<CoffeeModel>> listCoffees({
    String? q,
    String? roasteryId,
    String? roastColor,
    int page = 1,
  }) async {
    final res = await _dio.get('/coffees', queryParameters: {
      if (q != null) 'q': q,
      if (roasteryId != null) 'roasteryId': roasteryId,
      if (roastColor != null) 'roastColor': roastColor,
      'page': page,
    });
    final list = res.data['data'] as List;
    return list.map((e) => CoffeeModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<CoffeeModel> getCoffee(String id) async {
    final res = await _dio.get('/coffees/$id');
    return CoffeeModel.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  Future<CoffeeModel> createCoffee({
    required String name,
    required String roasteryId,
    String? producerId,
    String? variety,
    String? roastColor,
    String? processMethod,
    List<String> tastingNotes = const [],
    List<String> brewMethods = const [],
  }) async {
    final res = await _dio.post('/coffees', data: {
      'name': name,
      'roasteryId': roasteryId,
      if (producerId != null) 'producerId': producerId,
      if (variety != null) 'variety': variety,
      if (roastColor != null) 'roastColor': roastColor,
      if (processMethod != null) 'processMethod': processMethod,
      'tastingNotes': tastingNotes,
      'brewMethods': brewMethods,
    });
    return CoffeeModel.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  // ── Roasteries ───────────────────────────────────────────

  Future<List<RoasteryModel>> listRoasteries({String? q, int page = 1}) async {
    final res = await _dio.get('/roasteries', queryParameters: {
      if (q != null) 'q': q,
      'page': page,
    });
    final list = res.data['data'] as List;
    return list.map((e) => RoasteryModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<RoasteryModel> getRoastery(String id) async {
    final res = await _dio.get('/roasteries/$id');
    return RoasteryModel.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  Future<RoasteryModel> createRoastery({
    required String name,
    String? city,
    String? state,
    String? instagram,
  }) async {
    final res = await _dio.post('/roasteries', data: {
      'name': name,
      if (city != null) 'city': city,
      if (state != null) 'state': state,
      if (instagram != null) 'instagram': instagram,
    });
    return RoasteryModel.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  // ── Producers ────────────────────────────────────────────

  Future<List<ProducerModel>> listProducers({String? q, int page = 1}) async {
    final res = await _dio.get('/producers', queryParameters: {
      if (q != null) 'q': q,
      'page': page,
    });
    final list = res.data['data'] as List;
    return list.map((e) => ProducerModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<ProducerModel> createProducer({
    required String name,
    String? farmName,
    String? country,
  }) async {
    final res = await _dio.post('/producers', data: {
      'name': name,
      if (farmName != null) 'farmName': farmName,
      if (country != null) 'country': country,
    });
    return ProducerModel.fromJson(res.data['data'] as Map<String, dynamic>);
  }
}
