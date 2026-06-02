import 'package:flutter_test/flutter_test.dart';
import 'package:one_cup/shared/models/coffee_model.dart';
import 'package:one_cup/shared/models/roastery_model.dart';

void main() {
  group('CoffeeModel.roastLabel', () {
    RoasteryModel makeRoastery() =>
        RoasteryModel(id: 'r1', name: 'Test Roastery');

    CoffeeModel makeCoffee(String? roastColor) => CoffeeModel(
          id: 'c1',
          name: 'Test',
          roastery: makeRoastery(),
          tastingNotes: [],
          brewMethods: [],
          checkinCount: 0,
          roastColor: roastColor,
        );

    test('LIGHT returns Clara', () {
      expect(makeCoffee('LIGHT').roastLabel, 'Clara');
    });

    test('MEDIUM returns Média', () {
      expect(makeCoffee('MEDIUM').roastLabel, 'Média');
    });

    test('DARK returns Escura', () {
      expect(makeCoffee('DARK').roastLabel, 'Escura');
    });

    test('null returns empty string', () {
      expect(makeCoffee(null).roastLabel, '');
    });

    test('unknown value returns itself', () {
      expect(makeCoffee('UNKNOWN').roastLabel, 'UNKNOWN');
    });
  });

  group('RoasteryModel.location', () {
    test('returns city and state when both present', () {
      final r = RoasteryModel(
          id: 'r1', name: 'Café', city: 'São Paulo', state: 'SP');
      expect(r.location, 'São Paulo, SP');
    });

    test('returns country when city/state are null', () {
      final r =
          RoasteryModel(id: 'r1', name: 'Café', country: 'Brasil');
      expect(r.location, 'Brasil');
    });

    test('returns only city when state is null', () {
      final r =
          RoasteryModel(id: 'r1', name: 'Café', city: 'Belo Horizonte');
      expect(r.location, 'Belo Horizonte');
    });
  });
}
