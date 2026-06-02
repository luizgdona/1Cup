import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

// Exibe estrelas de 0.0 a 5.0 com suporte a meias estrelas.
// Para uso somente leitura — sem interação.
class StarRating extends StatelessWidget {
  final double value; // 0.0 – 5.0
  final double size;
  final Color? color;

  const StarRating({super.key, required this.value, this.size = 16, this.color});

  @override
  Widget build(BuildContext context) {
    final starColor = color ?? AppColors.roastedGoldLight;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (i) {
        final full = value >= i + 1;
        final half = !full && value >= i + 0.5;
        return Icon(
          full
              ? Icons.star_rounded
              : half
                  ? Icons.star_half_rounded
                  : Icons.star_outline_rounded,
          color: (full || half) ? starColor : starColor.withOpacity(0.3),
          size: size,
        );
      }),
    );
  }
}

// Versão interativa para o formulário de check-in (meias estrelas via drag)
class StarRatingInput extends StatefulWidget {
  final double value;
  final ValueChanged<double> onChanged;
  final double size;

  const StarRatingInput({
    super.key,
    required this.value,
    required this.onChanged,
    this.size = 36,
  });

  @override
  State<StarRatingInput> createState() => _StarRatingInputState();
}

class _StarRatingInputState extends State<StarRatingInput> {
  double _current = 0;

  @override
  void initState() {
    super.initState();
    _current = widget.value;
  }

  void _handleTap(TapDownDetails details, RenderBox box) {
    final localX = details.localPosition.dx;
    final totalWidth = box.size.width;
    final starWidth = totalWidth / 5;
    final raw = localX / starWidth; // 0..5
    // Snap para meia estrela
    final snapped = (raw * 2).round() / 2.0;
    final clamped = snapped.clamp(0.5, 5.0);
    setState(() => _current = clamped);
    widget.onChanged(clamped);
  }

  @override
  Widget build(BuildContext context) {
    final starColor = AppColors.roastedGoldLight;
    return GestureDetector(
      onTapDown: (d) {
        final box = context.findRenderObject() as RenderBox;
        _handleTap(d, box);
      },
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: List.generate(5, (i) {
          final full = _current >= i + 1;
          final half = !full && _current >= i + 0.5;
          return Icon(
            full
                ? Icons.star_rounded
                : half
                    ? Icons.star_half_rounded
                    : Icons.star_outline_rounded,
            color: (full || half) ? starColor : starColor.withOpacity(0.3),
            size: widget.size,
          );
        }),
      ),
    );
  }
}
