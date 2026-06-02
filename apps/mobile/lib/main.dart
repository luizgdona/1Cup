import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/constants/app_theme.dart';

void main() {
  runApp(const ProviderScope(child: OneCupApp()));
}

class OneCupApp extends ConsumerWidget {
  const OneCupApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp(
      title: '1Cup',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.system,
      home: const Scaffold(
        body: Center(
          child: Text('☕ 1Cup — em construção'),
        ),
      ),
    );
  }
}
