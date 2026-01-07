// STRAT Go SDK
// Complete API wrapper for STRAT blockchain
// Version 1.0.0

package stratsdk

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"time"
)

// Client represents a STRAT SDK client
type Client struct {
	APIURL     string
	APIKey     string
	HTTPClient *http.Client
}

// Config holds SDK configuration
type Config struct {
	APIURL  string
	APIKey  string
	Timeout time.Duration
}

// NewClient creates a new STRAT SDK client
func NewClient(config *Config) *Client {
	if config == nil {
		config = &Config{
			APIURL:  "http://localhost:3000",
			Timeout: 30 * time.Second,
		}
	}

	if config.Timeout == 0 {
		config.Timeout = 30 * time.Second
	}

	return &Client{
		APIURL: config.APIURL,
		APIKey: config.APIKey,
		HTTPClient: &http.Client{
			Timeout: config.Timeout,
		},
	}
}

// Request makes an HTTP request to the STRAT API
func (c *Client) Request(method, endpoint string, body interface{}) (map[string]interface{}, error) {
	url := c.APIURL + endpoint

	var reqBody io.Reader
	if body != nil {
		jsonData, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request body: %w", err)
		}
		reqBody = bytes.NewBuffer(jsonData)
	}

	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if c.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.APIKey)
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		var errorResp map[string]interface{}
		if err := json.Unmarshal(respBody, &errorResp); err == nil {
			if errMsg, ok := errorResp["error"].(string); ok {
				return nil, fmt.Errorf("API error (%d): %s", resp.StatusCode, errMsg)
			}
		}
		return nil, fmt.Errorf("API error (%d): %s", resp.StatusCode, string(respBody))
	}

	var result map[string]interface{}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return result, nil
}

// Blockchain Methods

// GetBlockchainInfo retrieves blockchain information
func (c *Client) GetBlockchainInfo() (map[string]interface{}, error) {
	return c.Request("GET", "/api/blockchain/info", nil)
}

// GetBlock retrieves a block by hash or index
func (c *Client) GetBlock(identifier string) (map[string]interface{}, error) {
	isIndex := regexp.MustCompile(`^\d+$`).MatchString(identifier)
	endpoint := "/api/blockchain/block/" + identifier
	if isIndex {
		endpoint = "/api/blockchain/block-by-index/" + identifier
	}
	return c.Request("GET", endpoint, nil)
}

// GetLatestBlocks retrieves the latest blocks
func (c *Client) GetLatestBlocks(count int) ([]map[string]interface{}, error) {
	result, err := c.Request("GET", fmt.Sprintf("/api/blockchain/blocks?limit=%d", count), nil)
	if err != nil {
		return nil, err
	}

	blocks, ok := result["blocks"].([]interface{})
	if !ok {
		return nil, fmt.Errorf("unexpected response format")
	}

	var typedBlocks []map[string]interface{}
	for _, block := range blocks {
		if b, ok := block.(map[string]interface{}); ok {
			typedBlocks = append(typedBlocks, b)
		}
	}

	return typedBlocks, nil
}

// Transaction Methods

// GetTransaction retrieves a transaction by ID
func (c *Client) GetTransaction(txID string) (map[string]interface{}, error) {
	return c.Request("GET", "/api/transactions/"+txID, nil)
}

// SendTransaction sends a transaction
func (c *Client) SendTransaction(from, to string, amount float64, privateKey string) (map[string]interface{}, error) {
	data := map[string]interface{}{
		"fromAddress": from,
		"toAddress":   to,
		"amount":      amount,
		"privateKey":  privateKey,
	}
	return c.Request("POST", "/api/transactions/send", data)
}

// GetTransactionHistory retrieves transaction history for an address
func (c *Client) GetTransactionHistory(address string, limit, offset int) ([]map[string]interface{}, error) {
	endpoint := fmt.Sprintf("/api/transactions/history/%s?limit=%d&offset=%d", address, limit, offset)
	result, err := c.Request("GET", endpoint, nil)
	if err != nil {
		return nil, err
	}

	transactions, ok := result["transactions"].([]interface{})
	if !ok {
		return nil, fmt.Errorf("unexpected response format")
	}

	var typedTxs []map[string]interface{}
	for _, tx := range transactions {
		if t, ok := tx.(map[string]interface{}); ok {
			typedTxs = append(typedTxs, t)
		}
	}

	return typedTxs, nil
}

// Wallet Methods

// CreateWallet creates a new wallet
func (c *Client) CreateWallet(username, password string) (map[string]interface{}, error) {
	data := map[string]interface{}{
		"username": username,
		"password": password,
	}
	return c.Request("POST", "/api/auth/register", data)
}

// GetBalance retrieves the balance of an address
func (c *Client) GetBalance(address string) (float64, error) {
	result, err := c.Request("GET", "/api/wallets/balance/"+address, nil)
	if err != nil {
		return 0, err
	}

	balance, ok := result["balance"].(float64)
	if !ok {
		return 0, fmt.Errorf("unexpected balance format")
	}

	return balance, nil
}

// GetWalletInfo retrieves wallet information
func (c *Client) GetWalletInfo(address string) (map[string]interface{}, error) {
	return c.Request("GET", "/api/wallets/"+address, nil)
}

// Smart Contract Methods

// DeployContract deploys a smart contract
func (c *Client) DeployContract(code, owner, privateKey string) (map[string]interface{}, error) {
	data := map[string]interface{}{
		"code":       code,
		"owner":      owner,
		"privateKey": privateKey,
	}
	return c.Request("POST", "/api/contracts/deploy", data)
}

// CallContract calls a smart contract method
func (c *Client) CallContract(contractAddress, method string, params []interface{}, caller, privateKey string) (map[string]interface{}, error) {
	data := map[string]interface{}{
		"contractAddress": contractAddress,
		"method":          method,
		"params":          params,
		"caller":          caller,
		"privateKey":      privateKey,
	}
	return c.Request("POST", "/api/contracts/call", data)
}

// GetContract retrieves contract information
func (c *Client) GetContract(contractAddress string) (map[string]interface{}, error) {
	return c.Request("GET", "/api/contracts/"+contractAddress, nil)
}

// Mining Methods

// GetMiningInfo retrieves mining information
func (c *Client) GetMiningInfo() (map[string]interface{}, error) {
	return c.Request("GET", "/api/mining/info", nil)
}

// StartMining starts mining
func (c *Client) StartMining(minerAddress string) (map[string]interface{}, error) {
	data := map[string]interface{}{
		"minerAddress": minerAddress,
	}
	return c.Request("POST", "/api/mining/start", data)
}

// StopMining stops mining
func (c *Client) StopMining() (map[string]interface{}, error) {
	return c.Request("POST", "/api/mining/stop", nil)
}

// Staking Methods

// Stake stakes tokens
func (c *Client) Stake(address string, amount float64, privateKey string) (map[string]interface{}, error) {
	data := map[string]interface{}{
		"address":    address,
		"amount":     amount,
		"privateKey": privateKey,
	}
	return c.Request("POST", "/api/staking/stake", data)
}

// Unstake unstakes tokens
func (c *Client) Unstake(address string, amount float64, privateKey string) (map[string]interface{}, error) {
	data := map[string]interface{}{
		"address":    address,
		"amount":     amount,
		"privateKey": privateKey,
	}
	return c.Request("POST", "/api/staking/unstake", data)
}

// GetStakingInfo retrieves staking information
func (c *Client) GetStakingInfo(address string) (map[string]interface{}, error) {
	return c.Request("GET", "/api/staking/info/"+address, nil)
}

// ClaimRewards claims staking rewards
func (c *Client) ClaimRewards(address, privateKey string) (map[string]interface{}, error) {
	data := map[string]interface{}{
		"address":    address,
		"privateKey": privateKey,
	}
	return c.Request("POST", "/api/staking/claim", data)
}

// NFT Methods

// MintNFT mints a new NFT
func (c *Client) MintNFT(data map[string]interface{}) (map[string]interface{}, error) {
	return c.Request("POST", "/api/nft/mint", data)
}

// GetNFT retrieves NFT information
func (c *Client) GetNFT(tokenID int) (map[string]interface{}, error) {
	return c.Request("GET", fmt.Sprintf("/api/nft/%d", tokenID), nil)
}

// TransferNFT transfers an NFT
func (c *Client) TransferNFT(tokenID int, from, to, privateKey string) (map[string]interface{}, error) {
	data := map[string]interface{}{
		"tokenId":    tokenID,
		"from":       from,
		"to":         to,
		"privateKey": privateKey,
	}
	return c.Request("POST", "/api/nft/transfer", data)
}

// Governance Methods

// CreateProposal creates a governance proposal
func (c *Client) CreateProposal(data map[string]interface{}) (map[string]interface{}, error) {
	return c.Request("POST", "/api/governance/proposal", data)
}

// Vote votes on a proposal
func (c *Client) Vote(proposalID int, vote bool, voter, privateKey string) (map[string]interface{}, error) {
	data := map[string]interface{}{
		"proposalId": proposalID,
		"vote":       vote,
		"voter":      voter,
		"privateKey": privateKey,
	}
	return c.Request("POST", "/api/governance/vote", data)
}

// GetProposal retrieves a proposal
func (c *Client) GetProposal(proposalID int) (map[string]interface{}, error) {
	return c.Request("GET", fmt.Sprintf("/api/governance/proposal/%d", proposalID), nil)
}

// Utility Methods

// HealthCheck checks API health
func (c *Client) HealthCheck() (map[string]interface{}, error) {
	return c.Request("GET", "/health", nil)
}

// IsValidAddress validates an address format
func IsValidAddress(address string) bool {
	pattern := regexp.MustCompile(`^0x[a-fA-F0-9]{40}$`)
	return pattern.MatchString(address)
}

// ToWei converts amount to wei
func ToWei(amount float64) int64 {
	return int64(amount * 1e18)
}

// FromWei converts wei to amount
func FromWei(wei int64) float64 {
	return float64(wei) / 1e18
}
