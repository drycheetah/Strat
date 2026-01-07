// STRAT Rust SDK
// Complete API wrapper for STRAT blockchain
// Version 1.0.0

use reqwest::{Client, Error as ReqwestError};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::time::Duration;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum StratError {
    #[error("Network error: {0}")]
    NetworkError(String),

    #[error("API error ({status}): {message}")]
    ApiError { status: u16, message: String },

    #[error("Serialization error: {0}")]
    SerializationError(String),

    #[error("Invalid address format")]
    InvalidAddress,
}

impl From<ReqwestError> for StratError {
    fn from(err: ReqwestError) -> Self {
        StratError::NetworkError(err.to_string())
    }
}

impl From<serde_json::Error> for StratError {
    fn from(err: serde_json::Error) -> Self {
        StratError::SerializationError(err.to_string())
    }
}

#[derive(Debug, Clone)]
pub struct StratSDKConfig {
    pub api_url: String,
    pub api_key: Option<String>,
    pub timeout: Duration,
}

impl Default for StratSDKConfig {
    fn default() -> Self {
        Self {
            api_url: "http://localhost:3000".to_string(),
            api_key: None,
            timeout: Duration::from_secs(30),
        }
    }
}

pub struct StratSDK {
    config: StratSDKConfig,
    client: Client,
}

impl StratSDK {
    pub fn new(config: StratSDKConfig) -> Result<Self, StratError> {
        let client = Client::builder()
            .timeout(config.timeout)
            .build()?;

        Ok(Self { config, client })
    }

    pub fn with_default() -> Result<Self, StratError> {
        Self::new(StratSDKConfig::default())
    }

    async fn request(
        &self,
        method: reqwest::Method,
        endpoint: &str,
        body: Option<Value>,
    ) -> Result<Value, StratError> {
        let url = format!("{}{}", self.config.api_url, endpoint);

        let mut request = self.client.request(method, &url);

        if let Some(api_key) = &self.config.api_key {
            request = request.header("Authorization", format!("Bearer {}", api_key));
        }

        if let Some(body) = body {
            request = request.json(&body);
        }

        let response = request.send().await?;
        let status = response.status();

        if status.is_success() {
            let data: Value = response.json().await?;
            Ok(data)
        } else {
            let error_data: Value = response.json().await?;
            let message = error_data["error"]
                .as_str()
                .unwrap_or("Unknown error")
                .to_string();

            Err(StratError::ApiError {
                status: status.as_u16(),
                message,
            })
        }
    }

    // Blockchain Methods

    pub async fn get_blockchain_info(&self) -> Result<Value, StratError> {
        self.request(reqwest::Method::GET, "/api/blockchain/info", None)
            .await
    }

    pub async fn get_block(&self, identifier: &str) -> Result<Value, StratError> {
        let endpoint = if identifier.chars().all(|c| c.is_numeric()) {
            format!("/api/blockchain/block-by-index/{}", identifier)
        } else {
            format!("/api/blockchain/block/{}", identifier)
        };

        self.request(reqwest::Method::GET, &endpoint, None).await
    }

    pub async fn get_latest_blocks(&self, count: u32) -> Result<Value, StratError> {
        self.request(
            reqwest::Method::GET,
            &format!("/api/blockchain/blocks?limit={}", count),
            None,
        )
        .await
    }

    // Transaction Methods

    pub async fn get_transaction(&self, tx_id: &str) -> Result<Value, StratError> {
        self.request(
            reqwest::Method::GET,
            &format!("/api/transactions/{}", tx_id),
            None,
        )
        .await
    }

    pub async fn send_transaction(
        &self,
        from_address: &str,
        to_address: &str,
        amount: f64,
        private_key: &str,
    ) -> Result<Value, StratError> {
        let body = json!({
            "fromAddress": from_address,
            "toAddress": to_address,
            "amount": amount,
            "privateKey": private_key,
        });

        self.request(reqwest::Method::POST, "/api/transactions/send", Some(body))
            .await
    }

    pub async fn get_transaction_history(
        &self,
        address: &str,
        limit: u32,
        offset: u32,
    ) -> Result<Value, StratError> {
        self.request(
            reqwest::Method::GET,
            &format!(
                "/api/transactions/history/{}?limit={}&offset={}",
                address, limit, offset
            ),
            None,
        )
        .await
    }

    pub async fn get_pending_transactions(&self) -> Result<Value, StratError> {
        self.request(reqwest::Method::GET, "/api/transactions/pending", None)
            .await
    }

    // Wallet Methods

    pub async fn create_wallet(&self, username: &str, password: &str) -> Result<Value, StratError> {
        let body = json!({
            "username": username,
            "password": password,
        });

        self.request(reqwest::Method::POST, "/api/auth/register", Some(body))
            .await
    }

    pub async fn get_balance(&self, address: &str) -> Result<f64, StratError> {
        let result = self
            .request(
                reqwest::Method::GET,
                &format!("/api/wallets/balance/{}", address),
                None,
            )
            .await?;

        result["balance"]
            .as_f64()
            .ok_or_else(|| StratError::SerializationError("Invalid balance format".to_string()))
    }

    pub async fn get_wallet_info(&self, address: &str) -> Result<Value, StratError> {
        self.request(
            reqwest::Method::GET,
            &format!("/api/wallets/{}", address),
            None,
        )
        .await
    }

    pub async fn get_utxos(&self, address: &str) -> Result<Value, StratError> {
        self.request(
            reqwest::Method::GET,
            &format!("/api/wallets/utxos/{}", address),
            None,
        )
        .await
    }

    // Smart Contract Methods

    pub async fn deploy_contract(
        &self,
        code: &str,
        owner: &str,
        private_key: &str,
    ) -> Result<Value, StratError> {
        let body = json!({
            "code": code,
            "owner": owner,
            "privateKey": private_key,
        });

        self.request(reqwest::Method::POST, "/api/contracts/deploy", Some(body))
            .await
    }

    pub async fn call_contract(
        &self,
        contract_address: &str,
        method: &str,
        params: Vec<Value>,
        caller: &str,
        private_key: &str,
    ) -> Result<Value, StratError> {
        let body = json!({
            "contractAddress": contract_address,
            "method": method,
            "params": params,
            "caller": caller,
            "privateKey": private_key,
        });

        self.request(reqwest::Method::POST, "/api/contracts/call", Some(body))
            .await
    }

    pub async fn get_contract(&self, contract_address: &str) -> Result<Value, StratError> {
        self.request(
            reqwest::Method::GET,
            &format!("/api/contracts/{}", contract_address),
            None,
        )
        .await
    }

    pub async fn get_contract_state(&self, contract_address: &str) -> Result<Value, StratError> {
        self.request(
            reqwest::Method::GET,
            &format!("/api/contracts/{}/state", contract_address),
            None,
        )
        .await
    }

    // Mining Methods

    pub async fn get_mining_info(&self) -> Result<Value, StratError> {
        self.request(reqwest::Method::GET, "/api/mining/info", None)
            .await
    }

    pub async fn start_mining(&self, miner_address: &str) -> Result<Value, StratError> {
        let body = json!({
            "minerAddress": miner_address,
        });

        self.request(reqwest::Method::POST, "/api/mining/start", Some(body))
            .await
    }

    pub async fn stop_mining(&self) -> Result<Value, StratError> {
        self.request(reqwest::Method::POST, "/api/mining/stop", None)
            .await
    }

    pub async fn get_mining_stats(&self, address: &str) -> Result<Value, StratError> {
        self.request(
            reqwest::Method::GET,
            &format!("/api/mining/stats/{}", address),
            None,
        )
        .await
    }

    // Staking Methods

    pub async fn stake(
        &self,
        address: &str,
        amount: f64,
        private_key: &str,
    ) -> Result<Value, StratError> {
        let body = json!({
            "address": address,
            "amount": amount,
            "privateKey": private_key,
        });

        self.request(reqwest::Method::POST, "/api/staking/stake", Some(body))
            .await
    }

    pub async fn unstake(
        &self,
        address: &str,
        amount: f64,
        private_key: &str,
    ) -> Result<Value, StratError> {
        let body = json!({
            "address": address,
            "amount": amount,
            "privateKey": private_key,
        });

        self.request(reqwest::Method::POST, "/api/staking/unstake", Some(body))
            .await
    }

    pub async fn get_staking_info(&self, address: &str) -> Result<Value, StratError> {
        self.request(
            reqwest::Method::GET,
            &format!("/api/staking/info/{}", address),
            None,
        )
        .await
    }

    pub async fn claim_rewards(&self, address: &str, private_key: &str) -> Result<Value, StratError> {
        let body = json!({
            "address": address,
            "privateKey": private_key,
        });

        self.request(reqwest::Method::POST, "/api/staking/claim", Some(body))
            .await
    }

    // NFT Methods

    pub async fn mint_nft(&self, data: Value) -> Result<Value, StratError> {
        self.request(reqwest::Method::POST, "/api/nft/mint", Some(data))
            .await
    }

    pub async fn get_nft(&self, token_id: u64) -> Result<Value, StratError> {
        self.request(
            reqwest::Method::GET,
            &format!("/api/nft/{}", token_id),
            None,
        )
        .await
    }

    pub async fn transfer_nft(
        &self,
        token_id: u64,
        from: &str,
        to: &str,
        private_key: &str,
    ) -> Result<Value, StratError> {
        let body = json!({
            "tokenId": token_id,
            "from": from,
            "to": to,
            "privateKey": private_key,
        });

        self.request(reqwest::Method::POST, "/api/nft/transfer", Some(body))
            .await
    }

    pub async fn list_nfts(&self, owner: &str) -> Result<Value, StratError> {
        self.request(
            reqwest::Method::GET,
            &format!("/api/nft/list/{}", owner),
            None,
        )
        .await
    }

    // Governance Methods

    pub async fn create_proposal(&self, data: Value) -> Result<Value, StratError> {
        self.request(reqwest::Method::POST, "/api/governance/proposal", Some(data))
            .await
    }

    pub async fn vote(
        &self,
        proposal_id: u64,
        vote: bool,
        voter: &str,
        private_key: &str,
    ) -> Result<Value, StratError> {
        let body = json!({
            "proposalId": proposal_id,
            "vote": vote,
            "voter": voter,
            "privateKey": private_key,
        });

        self.request(reqwest::Method::POST, "/api/governance/vote", Some(body))
            .await
    }

    pub async fn get_proposal(&self, proposal_id: u64) -> Result<Value, StratError> {
        self.request(
            reqwest::Method::GET,
            &format!("/api/governance/proposal/{}", proposal_id),
            None,
        )
        .await
    }

    pub async fn list_proposals(&self) -> Result<Value, StratError> {
        self.request(reqwest::Method::GET, "/api/governance/proposals", None)
            .await
    }

    // Explorer Methods

    pub async fn search_address(&self, address: &str) -> Result<Value, StratError> {
        self.request(
            reqwest::Method::GET,
            &format!("/api/explorer/address/{}", address),
            None,
        )
        .await
    }

    pub async fn get_rich_list(&self, limit: u32) -> Result<Value, StratError> {
        self.request(
            reqwest::Method::GET,
            &format!("/api/explorer/richlist?limit={}", limit),
            None,
        )
        .await
    }

    pub async fn get_network_stats(&self) -> Result<Value, StratError> {
        self.request(reqwest::Method::GET, "/api/explorer/stats", None)
            .await
    }

    // Utility Methods

    pub async fn health_check(&self) -> Result<Value, StratError> {
        self.request(reqwest::Method::GET, "/health", None).await
    }

    pub fn is_valid_address(address: &str) -> bool {
        let re = regex::Regex::new(r"^0x[a-fA-F0-9]{40}$").unwrap();
        re.is_match(address)
    }

    pub fn to_wei(amount: f64) -> i64 {
        (amount * 1e18) as i64
    }

    pub fn from_wei(wei: i64) -> f64 {
        wei as f64 / 1e18
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_sdk_creation() {
        let sdk = StratSDK::with_default();
        assert!(sdk.is_ok());
    }

    #[test]
    fn test_address_validation() {
        assert!(StratSDK::is_valid_address(
            "0x1234567890abcdef1234567890abcdef12345678"
        ));
        assert!(!StratSDK::is_valid_address("invalid"));
    }

    #[test]
    fn test_wei_conversion() {
        assert_eq!(StratSDK::to_wei(1.0), 1000000000000000000);
        assert_eq!(StratSDK::from_wei(1000000000000000000), 1.0);
    }
}
