import 'package:flutter_test/flutter_test.dart';
import 'package:one_cup/shared/models/user_model.dart';

void main() {
  group('UserModel', () {
    UserModel makeUser({String role = 'USER'}) => UserModel(
          id: 'u1',
          username: 'testuser',
          displayName: 'Test User',
          role: role,
          createdAt: DateTime(2025, 1, 1),
        );

    test('isAdmin returns false for USER role', () {
      expect(makeUser().isAdmin, isFalse);
    });

    test('isAdmin returns true for ADMIN role', () {
      expect(makeUser(role: 'ADMIN').isAdmin, isTrue);
    });

    test('fromJson deserializes all fields', () {
      final json = {
        'id': 'u123',
        'username': 'barista_pro',
        'displayName': 'Barista Pro',
        'bio': 'Coffee lover',
        'avatarUrl': 'https://example.com/avatar.jpg',
        'role': 'USER',
        'email': 'barista@cafe.com',
        'createdAt': '2025-03-15T10:00:00.000Z',
      };

      final user = UserModel.fromJson(json);
      expect(user.id, 'u123');
      expect(user.username, 'barista_pro');
      expect(user.bio, 'Coffee lover');
      expect(user.email, 'barista@cafe.com');
      expect(user.isAdmin, isFalse);
    });

    test('copyWith updates only changed fields', () {
      final user = makeUser();
      final updated = user.copyWith(displayName: 'New Name', bio: 'New bio');
      expect(updated.displayName, 'New Name');
      expect(updated.bio, 'New bio');
      expect(updated.id, user.id); // unchanged
      expect(updated.username, user.username); // unchanged
    });
  });
}
