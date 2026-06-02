import 'roastery_model.dart';
import 'producer_model.dart';

class CoffeeModel {
  final String id;
  final String name;
  final RoasteryModel roastery;
  final ProducerModel? producer;
  final String? labelImageUrl;
  final String? variety;
  final String? roastColor;
  final String? processMethod;
  final List<String> tastingNotes;
  final double? scaScore;
  final List<String> brewMethods;
  final int checkinCount;
  final double? avgRating;

  const CoffeeModel({
    required this.id,
    required this.name,
    required this.roastery,
    this.producer,
    this.labelImageUrl,
    this.variety,
    this.roastColor,
    this.processMethod,
    required this.tastingNotes,
    this.scaScore,
    required this.brewMethods,
    required this.checkinCount,
    this.avgRating,
  });

  factory CoffeeModel.fromJson(Map<String, dynamic> json) => CoffeeModel(
        id: json['id'] as String,
        name: json['name'] as String,
        roastery: RoasteryModel.fromJson(json['roastery'] as Map<String, dynamic>),
        producer: json['producer'] != null
            ? ProducerModel.fromJson(json['producer'] as Map<String, dynamic>)
            : null,
        labelImageUrl: json['labelImageUrl'] as String?,
        variety: json['variety'] as String?,
        roastColor: json['roastColor'] as String?,
        processMethod: json['processMethod'] as String?,
        tastingNotes: List<String>.from(json['tastingNotes'] as List? ?? []),
        scaScore: json['scaScore'] != null ? double.tryParse(json['scaScore'].toString()) : null,
        brewMethods: List<String>.from(json['brewMethods'] as List? ?? []),
        checkinCount: (json['_count'] as Map<String, dynamic>?)?['checkins'] as int? ?? 0,
        avgRating: json['avgRating'] != null ? (json['avgRating'] as num).toDouble() : null,
      );

  String get roastLabel {
    const labels = {
      'LIGHT': 'Clara',
      'LIGHT_MEDIUM': 'Clara-Média',
      'MEDIUM': 'Média',
      'MEDIUM_DARK': 'Média-Escura',
      'DARK': 'Escura',
    };
    return labels[roastColor] ?? roastColor ?? '';
  }
}
