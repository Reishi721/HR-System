import 'package:isar/isar.dart';
import 'package:path_provider/path_provider.dart';

class IsarProvider {
  static late Isar _isar;

  static Future<void> init() async {
    final dir = await getApplicationDocumentsDirectory();
    _isar = await Isar.open(
      [
        // Add your Isar schemas here
        // UserSessionSchema,
      ],
      directory: dir.path,
    );
  }

  static Isar get isar => _isar;
}
