class RoasteryModel {
  final String id;
  final String name;
  final String? city;
  final String? state;
  final String? country;
  final String? instagram;
  final String? website;
  final String? logoUrl;
  final int? coffeeCount;

  const RoasteryModel({
    required this.id,
    required this.name,
    this.city,
    this.state,
    this.country,
    this.instagram,
    this.website,
    this.logoUrl,
    this.coffeeCount,
  });

  factory RoasteryModel.fromJson(Map<String, dynamic> json) => RoasteryModel(
        id: json['id'] as String,
        name: json['name'] as String,
        city: json['city'] as String?,
        state: json['state'] as String?,
        country: json['country'] as String?,
        instagram: json['instagram'] as String?,
        website: json['website'] as String?,
        logoUrl: json['logoUrl'] as String?,
        coffeeCount: (json['_count'] as Map<String, dynamic>?)?['coffees'] as int?,
      );

  String get location {
    final parts = [city, state].where((e) => e != null && e.isNotEmpty).toList();
    return parts.isEmpty ? (country ?? 'Brasil') : parts.join(', ');
  }
}
