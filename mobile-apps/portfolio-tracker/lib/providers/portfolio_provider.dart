import 'package:flutter/foundation.dart';
import '../models/wallet.dart';
import '../models/asset.dart';
import '../services/api_service.dart';

class PortfolioProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<WalletModel> _wallets = [];
  List<Asset> _assets = [];
  double _totalValue = 0.0;
  double _totalChange24h = 0.0;
  bool _isLoading = false;
  String? _error;

  List<WalletModel> get wallets => _wallets;
  List<Asset> get assets => _assets;
  double get totalValue => _totalValue;
  double get totalChange24h => _totalChange24h;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadPortfolio() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Load wallets from local storage
      _wallets = await _apiService.getWallets();

      // Load assets for each wallet
      _assets = [];
      for (var wallet in _wallets) {
        final walletAssets = await _apiService.getAssets(wallet.address);
        _assets.addAll(walletAssets);
      }

      // Calculate total value
      _calculateTotalValue();

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> addWallet(String address, String name) async {
    try {
      final wallet = WalletModel(
        address: address,
        name: name,
        balance: 0.0,
      );

      _wallets.add(wallet);
      await _apiService.saveWallet(wallet);

      notifyListeners();
      await loadPortfolio();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  Future<void> removeWallet(String address) async {
    try {
      _wallets.removeWhere((w) => w.address == address);
      await _apiService.removeWallet(address);

      notifyListeners();
      await loadPortfolio();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  void _calculateTotalValue() {
    _totalValue = _assets.fold(0.0, (sum, asset) => sum + asset.value);

    _totalChange24h = _assets.fold(
      0.0,
      (sum, asset) => sum + (asset.value * asset.change24h / 100),
    );
  }

  Future<void> refresh() async {
    await loadPortfolio();
  }

  Map<String, double> getAssetAllocation() {
    final Map<String, double> allocation = {};

    for (var asset in _assets) {
      final percentage = (asset.value / _totalValue) * 100;
      allocation[asset.symbol] = percentage;
    }

    return allocation;
  }

  List<Asset> getTopAssets({int limit = 5}) {
    final sorted = List<Asset>.from(_assets);
    sorted.sort((a, b) => b.value.compareTo(a.value));
    return sorted.take(limit).toList();
  }

  double getChangePercentage() {
    if (_totalValue == 0) return 0.0;
    return (_totalChange24h / _totalValue) * 100;
  }
}
