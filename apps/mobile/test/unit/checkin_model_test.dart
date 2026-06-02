import 'package:flutter_test/flutter_test.dart';
import 'package:one_cup/shared/models/checkin_model.dart';
import 'package:one_cup/shared/models/user_model.dart';

void main() {
  group('CheckinModel', () {
    final sampleUser = UserModel(
      id: 'user1',
      username: 'barista',
      displayName: 'Barista',
      role: 'USER',
      createdAt: DateTime(2025, 1, 1),
    );

    final sampleCoffee = CheckinCoffeeRef(
      id: 'coffee1',
      name: 'Santa Inês',
      roastery: CheckinRoasteryRef(id: 'r1', name: 'Mínimo Café'),
    );

    CheckinModel makeCheckin(int rating) => CheckinModel(
          id: 'c1',
          user: sampleUser,
          coffee: sampleCoffee,
          rating: rating,
          photos: [],
          isPublic: true,
          createdAt: DateTime(2025, 6, 1),
        );

    test('stars converts rating 50 → 5.0', () {
      expect(makeCheckin(50).stars, 5.0);
    });

    test('stars converts rating 0 → 0.0', () {
      expect(makeCheckin(0).stars, 0.0);
    });

    test('stars converts rating 45 → 4.5 (half star)', () {
      expect(makeCheckin(45).stars, 4.5);
    });

    test('stars converts rating 25 → 2.5', () {
      expect(makeCheckin(25).stars, 2.5);
    });

    test('fromJson deserializes correctly', () {
      final json = {
        'id': 'ci1',
        'rating': 40,
        'description': 'Fruity and bright',
        'brewMethod': 'V60',
        'locationName': 'Coffee Lab',
        'photos': ['https://example.com/photo.jpg'],
        'isPublic': true,
        'createdAt': '2025-06-01T10:00:00.000Z',
        'user': {
          'id': 'u1',
          'username': 'testuser',
          'displayName': 'Test User',
          'role': 'USER',
          'createdAt': '2025-01-01T00:00:00.000Z',
        },
        'coffee': {
          'id': 'cf1',
          'name': 'Test Coffee',
          'roastery': {'id': 'r1', 'name': 'Test Roastery'},
        },
      };

      final checkin = CheckinModel.fromJson(json);
      expect(checkin.id, 'ci1');
      expect(checkin.stars, 4.0);
      expect(checkin.brewMethod, 'V60');
      expect(checkin.photos.length, 1);
    });
  });
}
