import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_cup/shared/widgets/star_rating.dart';

Widget wrap(Widget child) =>
    MaterialApp(home: Scaffold(body: Center(child: child)));

void main() {
  group('StarRating widget', () {
    testWidgets('renders 5 star icons', (tester) async {
      await tester.pumpWidget(wrap(const StarRating(value: 3.5)));
      // 2 full, 1 half, 2 empty = 5 icons total
      expect(find.byType(Icon), findsNWidgets(5));
    });

    testWidgets('renders correctly for 0 stars', (tester) async {
      await tester.pumpWidget(wrap(const StarRating(value: 0)));
      expect(find.byType(Icon), findsNWidgets(5));
    });

    testWidgets('renders correctly for 5 stars', (tester) async {
      await tester.pumpWidget(wrap(const StarRating(value: 5)));
      expect(find.byType(Icon), findsNWidgets(5));
    });

    testWidgets('uses custom size', (tester) async {
      await tester.pumpWidget(wrap(const StarRating(value: 3, size: 24)));
      final icons = tester.widgetList<Icon>(find.byType(Icon)).toList();
      expect(icons.every((i) => i.size == 24), isTrue);
    });

    testWidgets('exposes an accessible rating label (a11y)', (tester) async {
      final handle = tester.ensureSemantics();
      await tester.pumpWidget(wrap(const StarRating(value: 4.5)));
      expect(find.bySemanticsLabel('Avaliação: 4.5 de 5 estrelas'), findsOneWidget);
      handle.dispose();
    });
  });
}
