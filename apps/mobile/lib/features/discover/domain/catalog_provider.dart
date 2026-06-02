import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/models/coffee_model.dart';
import '../../../shared/models/roastery_model.dart';
import '../data/catalog_repository.dart';

final catalogRepositoryProvider = Provider<CatalogRepository>((ref) => CatalogRepository());

// ── Coffees ───────────────────────────────────────────────

final coffeeSearchQueryProvider = StateProvider<String>((ref) => '');
final coffeeRoastFilterProvider = StateProvider<String?>((ref) => null);

final coffeesProvider = FutureProvider.autoDispose<List<CoffeeModel>>((ref) {
  final q = ref.watch(coffeeSearchQueryProvider);
  final roastColor = ref.watch(coffeeRoastFilterProvider);
  return ref.read(catalogRepositoryProvider).listCoffees(
        q: q.isEmpty ? null : q,
        roastColor: roastColor,
      );
});

final coffeeDetailProvider = FutureProvider.autoDispose.family<CoffeeModel, String>((ref, id) {
  return ref.read(catalogRepositoryProvider).getCoffee(id);
});

// ── Roasteries ────────────────────────────────────────────

final roasterySearchQueryProvider = StateProvider<String>((ref) => '');

final roasteriesProvider = FutureProvider.autoDispose<List<RoasteryModel>>((ref) {
  final q = ref.watch(roasterySearchQueryProvider);
  return ref.read(catalogRepositoryProvider).listRoasteries(q: q.isEmpty ? null : q);
});
