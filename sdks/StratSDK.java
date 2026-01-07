/**
 * STRAT Java SDK
 * Complete API wrapper for STRAT blockchain
 * Version 1.0.0
 */

package com.strat.sdk;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonArray;
import okhttp3.*;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

public class StratSDK {
    private final String apiUrl;
    private final String apiKey;
    private final OkHttpClient client;
    private final Gson gson;
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");

    public static class Builder {
        private String apiUrl = "http://localhost:3000";
        private String apiKey = null;
        private int timeout = 30;

        public Builder apiUrl(String apiUrl) {
            this.apiUrl = apiUrl;
            return this;
        }

        public Builder apiKey(String apiKey) {
            this.apiKey = apiKey;
            return this;
        }

        public Builder timeout(int seconds) {
            this.timeout = seconds;
            return this;
        }

        public StratSDK build() {
            return new StratSDK(this);
        }
    }

    private StratSDK(Builder builder) {
        this.apiUrl = builder.apiUrl;
        this.apiKey = builder.apiKey;
        this.gson = new Gson();

        OkHttpClient.Builder clientBuilder = new OkHttpClient.Builder()
                .connectTimeout(builder.timeout, TimeUnit.SECONDS)
                .readTimeout(builder.timeout, TimeUnit.SECONDS)
                .writeTimeout(builder.timeout, TimeUnit.SECONDS);

        this.client = clientBuilder.build();
    }

    public static Builder builder() {
        return new Builder();
    }

    private JsonObject request(String method, String endpoint, JsonObject body) throws StratException {
        String url = apiUrl + endpoint;

        Request.Builder requestBuilder = new Request.Builder().url(url);

        if (apiKey != null) {
            requestBuilder.header("Authorization", "Bearer " + apiKey);
        }

        RequestBody requestBody = null;
        if (body != null) {
            requestBody = RequestBody.create(gson.toJson(body), JSON);
        }

        switch (method.toUpperCase()) {
            case "GET":
                requestBuilder.get();
                break;
            case "POST":
                requestBuilder.post(requestBody != null ? requestBody : RequestBody.create("", JSON));
                break;
            case "PUT":
                requestBuilder.put(requestBody != null ? requestBody : RequestBody.create("", JSON));
                break;
            case "DELETE":
                requestBuilder.delete();
                break;
            default:
                throw new StratException("Unsupported HTTP method: " + method);
        }

        try (Response response = client.newCall(requestBuilder.build()).execute()) {
            String responseBody = response.body().string();

            if (!response.isSuccessful()) {
                JsonObject errorData = gson.fromJson(responseBody, JsonObject.class);
                String errorMessage = errorData.has("error") ?
                    errorData.get("error").getAsString() : "Unknown error";
                throw new StratException("API Error (" + response.code() + "): " + errorMessage);
            }

            return gson.fromJson(responseBody, JsonObject.class);
        } catch (IOException e) {
            throw new StratException("Network error: " + e.getMessage(), e);
        }
    }

    // Blockchain Methods

    public JsonObject getBlockchainInfo() throws StratException {
        return request("GET", "/api/blockchain/info", null);
    }

    public JsonObject getBlock(String identifier) throws StratException {
        String endpoint = identifier.matches("\\d+") ?
                "/api/blockchain/block-by-index/" + identifier :
                "/api/blockchain/block/" + identifier;
        return request("GET", endpoint, null);
    }

    public JsonObject getLatestBlocks(int count) throws StratException {
        return request("GET", "/api/blockchain/blocks?limit=" + count, null);
    }

    // Transaction Methods

    public JsonObject getTransaction(String txId) throws StratException {
        return request("GET", "/api/transactions/" + txId, null);
    }

    public JsonObject sendTransaction(String fromAddress, String toAddress,
                                      double amount, String privateKey) throws StratException {
        JsonObject body = new JsonObject();
        body.addProperty("fromAddress", fromAddress);
        body.addProperty("toAddress", toAddress);
        body.addProperty("amount", amount);
        body.addProperty("privateKey", privateKey);

        return request("POST", "/api/transactions/send", body);
    }

    public JsonObject getTransactionHistory(String address, int limit, int offset) throws StratException {
        String endpoint = String.format("/api/transactions/history/%s?limit=%d&offset=%d",
                address, limit, offset);
        return request("GET", endpoint, null);
    }

    public JsonObject getPendingTransactions() throws StratException {
        return request("GET", "/api/transactions/pending", null);
    }

    // Wallet Methods

    public JsonObject createWallet(String username, String password) throws StratException {
        JsonObject body = new JsonObject();
        body.addProperty("username", username);
        body.addProperty("password", password);

        return request("POST", "/api/auth/register", body);
    }

    public double getBalance(String address) throws StratException {
        JsonObject result = request("GET", "/api/wallets/balance/" + address, null);
        return result.get("balance").getAsDouble();
    }

    public JsonObject getWalletInfo(String address) throws StratException {
        return request("GET", "/api/wallets/" + address, null);
    }

    public JsonObject getUTXOs(String address) throws StratException {
        return request("GET", "/api/wallets/utxos/" + address, null);
    }

    // Smart Contract Methods

    public JsonObject deployContract(String code, String owner, String privateKey) throws StratException {
        JsonObject body = new JsonObject();
        body.addProperty("code", code);
        body.addProperty("owner", owner);
        body.addProperty("privateKey", privateKey);

        return request("POST", "/api/contracts/deploy", body);
    }

    public JsonObject callContract(String contractAddress, String method,
                                   JsonArray params, String caller, String privateKey) throws StratException {
        JsonObject body = new JsonObject();
        body.addProperty("contractAddress", contractAddress);
        body.addProperty("method", method);
        body.add("params", params);
        body.addProperty("caller", caller);
        body.addProperty("privateKey", privateKey);

        return request("POST", "/api/contracts/call", body);
    }

    public JsonObject getContract(String contractAddress) throws StratException {
        return request("GET", "/api/contracts/" + contractAddress, null);
    }

    public JsonObject getContractState(String contractAddress) throws StratException {
        return request("GET", "/api/contracts/" + contractAddress + "/state", null);
    }

    public JsonObject listContracts(int limit, int offset) throws StratException {
        String endpoint = String.format("/api/contracts?limit=%d&offset=%d", limit, offset);
        return request("GET", endpoint, null);
    }

    // Mining Methods

    public JsonObject getMiningInfo() throws StratException {
        return request("GET", "/api/mining/info", null);
    }

    public JsonObject startMining(String minerAddress) throws StratException {
        JsonObject body = new JsonObject();
        body.addProperty("minerAddress", minerAddress);
        return request("POST", "/api/mining/start", body);
    }

    public JsonObject stopMining() throws StratException {
        return request("POST", "/api/mining/stop", null);
    }

    public JsonObject getMiningStats(String address) throws StratException {
        return request("GET", "/api/mining/stats/" + address, null);
    }

    // Mempool Methods

    public JsonObject getMempoolInfo() throws StratException {
        return request("GET", "/api/mempool/stats", null);
    }

    public JsonObject getMempoolTransactions() throws StratException {
        return request("GET", "/api/mempool/transactions", null);
    }

    // Staking Methods

    public JsonObject stake(String address, double amount, String privateKey) throws StratException {
        JsonObject body = new JsonObject();
        body.addProperty("address", address);
        body.addProperty("amount", amount);
        body.addProperty("privateKey", privateKey);

        return request("POST", "/api/staking/stake", body);
    }

    public JsonObject unstake(String address, double amount, String privateKey) throws StratException {
        JsonObject body = new JsonObject();
        body.addProperty("address", address);
        body.addProperty("amount", amount);
        body.addProperty("privateKey", privateKey);

        return request("POST", "/api/staking/unstake", body);
    }

    public JsonObject getStakingInfo(String address) throws StratException {
        return request("GET", "/api/staking/info/" + address, null);
    }

    public JsonObject claimRewards(String address, String privateKey) throws StratException {
        JsonObject body = new JsonObject();
        body.addProperty("address", address);
        body.addProperty("privateKey", privateKey);

        return request("POST", "/api/staking/claim", body);
    }

    // NFT Methods

    public JsonObject mintNFT(JsonObject data) throws StratException {
        return request("POST", "/api/nft/mint", data);
    }

    public JsonObject getNFT(int tokenId) throws StratException {
        return request("GET", "/api/nft/" + tokenId, null);
    }

    public JsonObject transferNFT(int tokenId, String from, String to, String privateKey) throws StratException {
        JsonObject body = new JsonObject();
        body.addProperty("tokenId", tokenId);
        body.addProperty("from", from);
        body.addProperty("to", to);
        body.addProperty("privateKey", privateKey);

        return request("POST", "/api/nft/transfer", body);
    }

    public JsonObject listNFTs(String owner) throws StratException {
        return request("GET", "/api/nft/list/" + owner, null);
    }

    // Governance Methods

    public JsonObject createProposal(JsonObject data) throws StratException {
        return request("POST", "/api/governance/proposal", data);
    }

    public JsonObject vote(int proposalId, boolean vote, String voter, String privateKey) throws StratException {
        JsonObject body = new JsonObject();
        body.addProperty("proposalId", proposalId);
        body.addProperty("vote", vote);
        body.addProperty("voter", voter);
        body.addProperty("privateKey", privateKey);

        return request("POST", "/api/governance/vote", body);
    }

    public JsonObject getProposal(int proposalId) throws StratException {
        return request("GET", "/api/governance/proposal/" + proposalId, null);
    }

    public JsonObject listProposals() throws StratException {
        return request("GET", "/api/governance/proposals", null);
    }

    // Explorer Methods

    public JsonObject searchAddress(String address) throws StratException {
        return request("GET", "/api/explorer/address/" + address, null);
    }

    public JsonObject getRichList(int limit) throws StratException {
        return request("GET", "/api/explorer/richlist?limit=" + limit, null);
    }

    public JsonObject getNetworkStats() throws StratException {
        return request("GET", "/api/explorer/stats", null);
    }

    // Utility Methods

    public JsonObject healthCheck() throws StratException {
        return request("GET", "/health", null);
    }

    public static boolean isValidAddress(String address) {
        Pattern pattern = Pattern.compile("^0x[a-fA-F0-9]{40}$");
        return pattern.matcher(address).matches();
    }

    public static long toWei(double amount) {
        return (long) (amount * 1e18);
    }

    public static double fromWei(long wei) {
        return wei / 1e18;
    }

    public void close() {
        client.dispatcher().executorService().shutdown();
        client.connectionPool().evictAll();
    }

    // Custom Exception Class
    public static class StratException extends Exception {
        public StratException(String message) {
            super(message);
        }

        public StratException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    // Example Usage
    public static void main(String[] args) {
        StratSDK sdk = StratSDK.builder()
                .apiUrl("http://localhost:3000")
                .timeout(30)
                .build();

        try {
            // Get blockchain info
            JsonObject info = sdk.getBlockchainInfo();
            System.out.println("Blockchain Height: " + info.get("height"));
            System.out.println("Difficulty: " + info.get("difficulty"));

            // Get balance
            double balance = sdk.getBalance("0x1234567890abcdef1234567890abcdef12345678");
            System.out.println("Balance: " + balance + " STRAT");

        } catch (StratException e) {
            System.err.println("Error: " + e.getMessage());
        } finally {
            sdk.close();
        }
    }
}
