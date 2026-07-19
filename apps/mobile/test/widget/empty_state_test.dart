import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:one_cup/shared/widgets/empty_state.dart';

Widget wrap(Widget child) => MaterialApp(home: Scaffold(body: child));

void main() {
  group('EmptyState widget', () {
    testWidgets('shows the title, message and icon', (tester) async {
      await tester.pumpWidget(wrap(const EmptyState(
        icon: Icons.people_outline,
        title: 'Seu feed está vazio',
        message: 'Adicione amigos para começar.',
      )));

      expect(find.text('Seu feed está vazio'), findsOneWidget);
      expect(find.text('Adicione amigos para começar.'), findsOneWidget);
      expect(find.byIcon(Icons.people_outline), findsOneWidget);
    });

    testWidgets('renders the action button and fires the callback', (tester) async {
      var tapped = false;
      await tester.pumpWidget(wrap(EmptyState(
        icon: Icons.coffee,
        title: 'Nada aqui',
        actionLabel: 'Fazer check-in',
        onAction: () => tapped = true,
      )));

      final button = find.widgetWithText(FilledButton, 'Fazer check-in');
      expect(button, findsOneWidget);
      await tester.tap(button);
      expect(tapped, isTrue);
    });

    testWidgets('omits the action button when no callback is given', (tester) async {
      await tester.pumpWidget(wrap(const EmptyState(icon: Icons.coffee, title: 'Vazio')));
      expect(find.byType(FilledButton), findsNothing);
    });
  });
}
