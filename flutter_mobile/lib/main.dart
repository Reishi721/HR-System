import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr_mobile/core/router/app_router.dart';
import 'package:hr_mobile/core/storage/isar_provider.dart';

import 'package:forui/forui.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Supabase
  await Supabase.initialize(
    url: 'https://bjoggpxbzynhambbnhhd.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqb2dncHhienluaGFtYmJuaGhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwODI1NDcsImV4cCI6MjA5MTY1ODU0N30.ivYa3BD5jYyaGwUR1JimJSD5o-168QLsQvvt2Avxyoc',
  );

  // Initialize Isar
  await IsarProvider.init();

  runApp(
    const ProviderScope(
      child: MyApp(),
    ),
  );
}

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);
    final theme = FThemes.zinc.light;

    return MaterialApp.router(
      title: 'HR System',
      theme: theme.toApproximateMaterialTheme(),
      builder: (context, child) => FTheme(
        data: theme,
        child: child!,
      ),
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
