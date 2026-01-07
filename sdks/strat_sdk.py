"""
STRAT Python SDK
Complete API wrapper for STRAT blockchain
Version 1.0.0
"""

import requests
import json
import time
from typing import Optional, Dict, List, Any
from enum import Enum


class StratException(Exception):
    """Base exception for STRAT SDK"""
    pass


class NetworkException(StratException):
    """Network-related exceptions"""
    pass


class APIException(StratException):
    """API-related exceptions"""
    pass


class TransactionType(Enum):
    """Transaction types"""
    STANDARD = "standard"
    CONTRACT_DEPLOY = "contract_deploy"
    CONTRACT_CALL = "contract_call"
    STAKE = "stake"
    UNSTAKE = "unstake"


class StratSDK:
    """STRAT Blockchain SDK for Python"""

    def __init__(self, api_url: str = "http://localhost:3000", api_key: Optional[str] = None, timeout: int = 30):
        """
        Initialize STRAT SDK

        Args:
            api_url: Base URL for STRAT API
            api_key: Optional API key for authentication
            timeout: Request timeout in seconds
        """
        self.api_url = api_url.rstrip('/')
        self.api_key = api_key
        self.timeout = timeout
        self.session = requests.Session()

        if api_key:
            self.session.headers.update({'Authorization': f'Bearer {api_key}'})

    def _request(self, method: str, endpoint: str, data: Optional[Dict] = None, params: Optional[Dict] = None) -> Any:
        """
        Make HTTP request to API

        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint
            data: Request body data
            params: Query parameters

        Returns:
            API response data

        Raises:
            NetworkException: If network error occurs
            APIException: If API returns error
        """
        url = f"{self.api_url}{endpoint}"

        try:
            if method == 'GET':
                response = self.session.get(url, params=params, timeout=self.timeout)
            elif method == 'POST':
                response = self.session.post(url, json=data, timeout=self.timeout)
            elif method == 'PUT':
                response = self.session.put(url, json=data, timeout=self.timeout)
            elif method == 'DELETE':
                response = self.session.delete(url, timeout=self.timeout)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")

            response.raise_for_status()
            return response.json()

        except requests.exceptions.Timeout:
            raise NetworkException(f"Request timeout after {self.timeout} seconds")
        except requests.exceptions.ConnectionError:
            raise NetworkException(f"Could not connect to {self.api_url}")
        except requests.exceptions.HTTPError as e:
            try:
                error_data = response.json()
                raise APIException(f"API Error ({response.status_code}): {error_data.get('error', str(e))}")
            except json.JSONDecodeError:
                raise APIException(f"API Error ({response.status_code}): {response.text}")
        except Exception as e:
            raise StratException(f"Unexpected error: {str(e)}")

    # Blockchain Methods
    def get_blockchain_info(self) -> Dict:
        """Get blockchain information"""
        return self._request('GET', '/api/blockchain/info')

    def get_block(self, identifier: str) -> Dict:
        """
        Get block by hash or index

        Args:
            identifier: Block hash or index

        Returns:
            Block data
        """
        if identifier.isdigit():
            return self._request('GET', f'/api/blockchain/block-by-index/{identifier}')
        else:
            return self._request('GET', f'/api/blockchain/block/{identifier}')

    def get_latest_blocks(self, count: int = 10) -> List[Dict]:
        """Get latest blocks"""
        return self._request('GET', '/api/blockchain/blocks', params={'limit': count})

    # Transaction Methods
    def get_transaction(self, tx_id: str) -> Dict:
        """Get transaction by ID"""
        return self._request('GET', f'/api/transactions/{tx_id}')

    def send_transaction(self, from_address: str, to_address: str, amount: float, private_key: str) -> Dict:
        """
        Send transaction

        Args:
            from_address: Sender address
            to_address: Recipient address
            amount: Amount to send
            private_key: Sender's private key

        Returns:
            Transaction result
        """
        return self._request('POST', '/api/transactions/send', {
            'fromAddress': from_address,
            'toAddress': to_address,
            'amount': amount,
            'privateKey': private_key
        })

    def get_transaction_history(self, address: str, limit: int = 50, offset: int = 0) -> List[Dict]:
        """Get transaction history for address"""
        return self._request('GET', f'/api/transactions/history/{address}',
                           params={'limit': limit, 'offset': offset})

    def get_pending_transactions(self) -> List[Dict]:
        """Get pending transactions"""
        return self._request('GET', '/api/transactions/pending')

    # Wallet Methods
    def create_wallet(self, username: str, password: str) -> Dict:
        """
        Create new wallet

        Args:
            username: Username
            password: Password

        Returns:
            Wallet data with address and keys
        """
        return self._request('POST', '/api/auth/register', {
            'username': username,
            'password': password
        })

    def get_balance(self, address: str) -> float:
        """Get address balance"""
        result = self._request('GET', f'/api/wallets/balance/{address}')
        return result['balance']

    def get_wallet_info(self, address: str) -> Dict:
        """Get wallet information"""
        return self._request('GET', f'/api/wallets/{address}')

    def get_utxos(self, address: str) -> List[Dict]:
        """Get UTXOs for address"""
        return self._request('GET', f'/api/wallets/utxos/{address}')

    # Smart Contract Methods
    def deploy_contract(self, code: str, owner: str, private_key: str) -> Dict:
        """
        Deploy smart contract

        Args:
            code: Contract code
            owner: Contract owner address
            private_key: Owner's private key

        Returns:
            Deployment result with contract address
        """
        return self._request('POST', '/api/contracts/deploy', {
            'code': code,
            'owner': owner,
            'privateKey': private_key
        })

    def call_contract(self, contract_address: str, method: str, params: List,
                     caller: str, private_key: str) -> Dict:
        """
        Call smart contract method

        Args:
            contract_address: Contract address
            method: Method name
            params: Method parameters
            caller: Caller address
            private_key: Caller's private key

        Returns:
            Contract call result
        """
        return self._request('POST', '/api/contracts/call', {
            'contractAddress': contract_address,
            'method': method,
            'params': params,
            'caller': caller,
            'privateKey': private_key
        })

    def get_contract(self, contract_address: str) -> Dict:
        """Get contract information"""
        return self._request('GET', f'/api/contracts/{contract_address}')

    def get_contract_state(self, contract_address: str) -> Dict:
        """Get contract state"""
        return self._request('GET', f'/api/contracts/{contract_address}/state')

    def list_contracts(self, limit: int = 50, offset: int = 0) -> List[Dict]:
        """List all contracts"""
        return self._request('GET', '/api/contracts',
                           params={'limit': limit, 'offset': offset})

    # Mining Methods
    def get_mining_info(self) -> Dict:
        """Get mining information"""
        return self._request('GET', '/api/mining/info')

    def start_mining(self, miner_address: str) -> Dict:
        """Start mining"""
        return self._request('POST', '/api/mining/start', {
            'minerAddress': miner_address
        })

    def stop_mining(self) -> Dict:
        """Stop mining"""
        return self._request('POST', '/api/mining/stop')

    def get_mining_stats(self, address: str) -> Dict:
        """Get mining statistics for address"""
        return self._request('GET', f'/api/mining/stats/{address}')

    # Mempool Methods
    def get_mempool_info(self) -> Dict:
        """Get mempool information"""
        return self._request('GET', '/api/mempool/stats')

    def get_mempool_transactions(self) -> List[Dict]:
        """Get mempool transactions"""
        return self._request('GET', '/api/mempool/transactions')

    # Staking Methods
    def stake(self, address: str, amount: float, private_key: str) -> Dict:
        """
        Stake tokens

        Args:
            address: Staker address
            amount: Amount to stake
            private_key: Staker's private key

        Returns:
            Staking result
        """
        return self._request('POST', '/api/staking/stake', {
            'address': address,
            'amount': amount,
            'privateKey': private_key
        })

    def unstake(self, address: str, amount: float, private_key: str) -> Dict:
        """Unstake tokens"""
        return self._request('POST', '/api/staking/unstake', {
            'address': address,
            'amount': amount,
            'privateKey': private_key
        })

    def get_staking_info(self, address: str) -> Dict:
        """Get staking information"""
        return self._request('GET', f'/api/staking/info/{address}')

    def claim_rewards(self, address: str, private_key: str) -> Dict:
        """Claim staking rewards"""
        return self._request('POST', '/api/staking/claim', {
            'address': address,
            'privateKey': private_key
        })

    # NFT Methods
    def mint_nft(self, data: Dict) -> Dict:
        """Mint NFT"""
        return self._request('POST', '/api/nft/mint', data)

    def get_nft(self, token_id: int) -> Dict:
        """Get NFT by token ID"""
        return self._request('GET', f'/api/nft/{token_id}')

    def transfer_nft(self, token_id: int, from_address: str, to_address: str, private_key: str) -> Dict:
        """Transfer NFT"""
        return self._request('POST', '/api/nft/transfer', {
            'tokenId': token_id,
            'from': from_address,
            'to': to_address,
            'privateKey': private_key
        })

    def list_nfts(self, owner: str) -> List[Dict]:
        """List NFTs owned by address"""
        return self._request('GET', f'/api/nft/list/{owner}')

    # Governance Methods
    def create_proposal(self, data: Dict) -> Dict:
        """Create governance proposal"""
        return self._request('POST', '/api/governance/proposal', data)

    def vote(self, proposal_id: int, vote: bool, voter: str, private_key: str) -> Dict:
        """Vote on proposal"""
        return self._request('POST', '/api/governance/vote', {
            'proposalId': proposal_id,
            'vote': vote,
            'voter': voter,
            'privateKey': private_key
        })

    def get_proposal(self, proposal_id: int) -> Dict:
        """Get proposal by ID"""
        return self._request('GET', f'/api/governance/proposal/{proposal_id}')

    def list_proposals(self, status: Optional[str] = None) -> List[Dict]:
        """List governance proposals"""
        params = {'status': status} if status else {}
        return self._request('GET', '/api/governance/proposals', params=params)

    # Explorer Methods
    def search_address(self, address: str) -> Dict:
        """Search for address information"""
        return self._request('GET', f'/api/explorer/address/{address}')

    def get_rich_list(self, limit: int = 100) -> List[Dict]:
        """Get rich list"""
        return self._request('GET', '/api/explorer/richlist', params={'limit': limit})

    def get_network_stats(self) -> Dict:
        """Get network statistics"""
        return self._request('GET', '/api/explorer/stats')

    # Utility Methods
    def health_check(self) -> Dict:
        """Check API health"""
        return self._request('GET', '/health')

    def is_valid_address(self, address: str) -> bool:
        """Validate address format"""
        import re
        return bool(re.match(r'^0x[a-fA-F0-9]{40}$', address))

    def to_wei(self, amount: float) -> int:
        """Convert amount to wei"""
        return int(amount * 1e18)

    def from_wei(self, amount: int) -> float:
        """Convert wei to amount"""
        return amount / 1e18

    def close(self):
        """Close session"""
        self.session.close()

    def __enter__(self):
        """Context manager entry"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.close()


# Example usage
if __name__ == '__main__':
    # Create SDK instance
    sdk = StratSDK(api_url='http://localhost:3000')

    try:
        # Get blockchain info
        info = sdk.get_blockchain_info()
        print(f"Blockchain Height: {info['height']}")
        print(f"Difficulty: {info['difficulty']}")

        # Get balance
        balance = sdk.get_balance('0x1234567890abcdef1234567890abcdef12345678')
        print(f"Balance: {balance} STRAT")

    except StratException as e:
        print(f"Error: {e}")
    finally:
        sdk.close()
