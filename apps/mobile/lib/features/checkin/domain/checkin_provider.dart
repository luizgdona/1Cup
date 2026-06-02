import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/models/checkin_model.dart';
import '../data/checkin_repository.dart';

final checkinRepositoryProvider = Provider<CheckinRepository>((ref) => CheckinRepository());

// ── Feed (friend feed com infinite scroll por cursor) ─────

class FeedState {
  final List<CheckinModel> items;
  final String? nextCursor;
  final bool hasMore;
  final bool isLoadingMore;

  const FeedState({
    this.items = const [],
    this.nextCursor,
    this.hasMore = true,
    this.isLoadingMore = false,
  });

  FeedState copyWith({
    List<CheckinModel>? items,
    String? nextCursor,
    bool? hasMore,
    bool? isLoadingMore,
  }) =>
      FeedState(
        items: items ?? this.items,
        nextCursor: nextCursor,
        hasMore: hasMore ?? this.hasMore,
        isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      );
}

final feedProvider = AsyncNotifierProvider<FeedNotifier, FeedState>(FeedNotifier.new);

class FeedNotifier extends AsyncNotifier<FeedState> {
  late CheckinRepository _repo;

  @override
  Future<FeedState> build() async {
    _repo = ref.read(checkinRepositoryProvider);
    return _loadFirst();
  }

  Future<FeedState> _loadFirst() async {
    final result = await _repo.getFeed();
    return FeedState(
      items: result.items,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    );
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_loadFirst);
  }

  Future<void> loadMore() async {
    final current = state.valueOrNull;
    if (current == null || !current.hasMore || current.isLoadingMore) return;

    state = AsyncData(current.copyWith(isLoadingMore: true));
    try {
      final result = await _repo.getFeed(cursor: current.nextCursor);
      state = AsyncData(current.copyWith(
        items: [...current.items, ...result.items],
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
        isLoadingMore: false,
      ));
    } catch (_) {
      state = AsyncData(current.copyWith(isLoadingMore: false));
    }
  }

  void prependCheckin(CheckinModel checkin) {
    final current = state.valueOrNull;
    if (current != null) {
      state = AsyncData(current.copyWith(items: [checkin, ...current.items]));
    }
  }
}
