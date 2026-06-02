import 'user_model.dart';

class CheckinCoffeeRef {
  final String id;
  final String name;
  final String? variety;
  final String? roastColor;
  final String? labelImageUrl;
  final CheckinRoasteryRef roastery;

  const CheckinCoffeeRef({
    required this.id,
    required this.name,
    this.variety,
    this.roastColor,
    this.labelImageUrl,
    required this.roastery,
  });

  factory CheckinCoffeeRef.fromJson(Map<String, dynamic> json) => CheckinCoffeeRef(
        id: json['id'] as String,
        name: json['name'] as String,
        variety: json['variety'] as String?,
        roastColor: json['roastColor'] as String?,
        labelImageUrl: json['labelImageUrl'] as String?,
        roastery: CheckinRoasteryRef.fromJson(json['roastery'] as Map<String, dynamic>),
      );
}

class CheckinRoasteryRef {
  final String id;
  final String name;
  const CheckinRoasteryRef({required this.id, required this.name});
  factory CheckinRoasteryRef.fromJson(Map<String, dynamic> json) =>
      CheckinRoasteryRef(id: json['id'] as String, name: json['name'] as String);
}

class CheckinModel {
  final String id;
  final UserModel user;
  final CheckinCoffeeRef coffee;
  // Rating: 0–50 internamente (meia estrela = 5 pts)
  final int rating;
  final String? description;
  final String? brewMethod;
  final String? locationName;
  final List<String> photos;
  final bool isPublic;
  final DateTime createdAt;

  const CheckinModel({
    required this.id,
    required this.user,
    required this.coffee,
    required this.rating,
    this.description,
    this.brewMethod,
    this.locationName,
    required this.photos,
    required this.isPublic,
    required this.createdAt,
  });

  /// Converte rating interno (0-50) para estrelas (0.0-5.0)
  double get stars => rating / 10.0;

  factory CheckinModel.fromJson(Map<String, dynamic> json) => CheckinModel(
        id: json['id'] as String,
        user: UserModel.fromJson(json['user'] as Map<String, dynamic>),
        coffee: CheckinCoffeeRef.fromJson(json['coffee'] as Map<String, dynamic>),
        rating: json['rating'] as int,
        description: json['description'] as String?,
        brewMethod: json['brewMethod'] as String?,
        locationName: json['locationName'] as String?,
        photos: List<String>.from(json['photos'] as List? ?? []),
        isPublic: json['isPublic'] as bool? ?? true,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
}
