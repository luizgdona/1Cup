class UserModel {
  final String id;
  final String username;
  final String displayName;
  final String? bio;
  final String? avatarUrl;
  final String role;
  final String? email;
  final DateTime createdAt;

  const UserModel({
    required this.id,
    required this.username,
    required this.displayName,
    this.bio,
    this.avatarUrl,
    required this.role,
    this.email,
    required this.createdAt,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) => UserModel(
        id: json['id'] as String,
        username: json['username'] as String,
        displayName: json['displayName'] as String,
        bio: json['bio'] as String?,
        avatarUrl: json['avatarUrl'] as String?,
        role: json['role'] as String,
        email: json['email'] as String?,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );

  UserModel copyWith({
    String? displayName,
    String? bio,
    String? avatarUrl,
  }) =>
      UserModel(
        id: id,
        username: username,
        displayName: displayName ?? this.displayName,
        bio: bio ?? this.bio,
        avatarUrl: avatarUrl ?? this.avatarUrl,
        role: role,
        email: email,
        createdAt: createdAt,
      );

  bool get isAdmin => role == 'ADMIN';
}
