class ProducerModel {
  final String id;
  final String name;
  final String? farmName;
  final String? city;
  final String? state;
  final String? country;
  final String? altitude;

  const ProducerModel({
    required this.id,
    required this.name,
    this.farmName,
    this.city,
    this.state,
    this.country,
    this.altitude,
  });

  factory ProducerModel.fromJson(Map<String, dynamic> json) => ProducerModel(
        id: json['id'] as String,
        name: json['name'] as String,
        farmName: json['farmName'] as String?,
        city: json['city'] as String?,
        state: json['state'] as String?,
        country: json['country'] as String?,
        altitude: json['altitude'] as String?,
      );
}
