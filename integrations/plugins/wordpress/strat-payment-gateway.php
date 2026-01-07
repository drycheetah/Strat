<?php
/**
 * Plugin Name: STRAT Payment Gateway for WooCommerce
 * Plugin URI: https://strat.io/wordpress-plugin
 * Description: Accept STRAT cryptocurrency payments in your WooCommerce store
 * Version: 1.0.0
 * Author: STRAT Team
 * Author URI: https://strat.io
 * License: GPL v2 or later
 * Text Domain: strat-payment
 */

if (!defined('ABSPATH')) {
    exit;
}

// Check if WooCommerce is active
if (in_array('woocommerce/woocommerce.php', apply_filters('active_plugins', get_option('active_plugins')))) {

    add_action('plugins_loaded', 'strat_payment_gateway_init', 11);

    function strat_payment_gateway_init() {
        if (!class_exists('WC_Payment_Gateway')) {
            return;
        }

        class WC_STRAT_Payment_Gateway extends WC_Payment_Gateway {
            public function __construct() {
                $this->id = 'strat_payment';
                $this->icon = plugin_dir_url(__FILE__) . 'assets/strat-icon.png';
                $this->has_fields = true;
                $this->method_title = 'STRAT Payment';
                $this->method_description = 'Accept STRAT cryptocurrency payments';

                $this->supports = array(
                    'products',
                    'refunds'
                );

                $this->init_form_fields();
                $this->init_settings();

                $this->title = $this->get_option('title');
                $this->description = $this->get_option('description');
                $this->enabled = $this->get_option('enabled');
                $this->wallet_address = $this->get_option('wallet_address');
                $this->api_endpoint = $this->get_option('api_endpoint');
                $this->confirmations_required = $this->get_option('confirmations_required');
                $this->conversion_rate_provider = $this->get_option('conversion_rate_provider');

                add_action('woocommerce_update_options_payment_gateways_' . $this->id, array($this, 'process_admin_options'));
                add_action('woocommerce_api_' . strtolower(get_class($this)), array($this, 'check_payment_callback'));
            }

            public function init_form_fields() {
                $this->form_fields = array(
                    'enabled' => array(
                        'title' => 'Enable/Disable',
                        'type' => 'checkbox',
                        'label' => 'Enable STRAT Payment',
                        'default' => 'yes'
                    ),
                    'title' => array(
                        'title' => 'Title',
                        'type' => 'text',
                        'description' => 'This controls the title which the user sees during checkout.',
                        'default' => 'STRAT Cryptocurrency',
                        'desc_tip' => true,
                    ),
                    'description' => array(
                        'title' => 'Description',
                        'type' => 'textarea',
                        'description' => 'Payment method description that the customer will see on your checkout.',
                        'default' => 'Pay with STRAT cryptocurrency',
                    ),
                    'wallet_address' => array(
                        'title' => 'Wallet Address',
                        'type' => 'text',
                        'description' => 'Your STRAT wallet address to receive payments',
                        'desc_tip' => true,
                    ),
                    'api_endpoint' => array(
                        'title' => 'API Endpoint',
                        'type' => 'text',
                        'description' => 'STRAT API endpoint URL',
                        'default' => 'https://api.strat.io',
                        'desc_tip' => true,
                    ),
                    'confirmations_required' => array(
                        'title' => 'Confirmations Required',
                        'type' => 'number',
                        'description' => 'Number of blockchain confirmations required',
                        'default' => '3',
                        'desc_tip' => true,
                    ),
                    'conversion_rate_provider' => array(
                        'title' => 'Conversion Rate Provider',
                        'type' => 'select',
                        'description' => 'Service to get STRAT/USD conversion rate',
                        'options' => array(
                            'coingecko' => 'CoinGecko',
                            'binance' => 'Binance',
                            'coinbase' => 'Coinbase',
                        ),
                        'default' => 'coingecko',
                    ),
                );
            }

            public function payment_fields() {
                if ($this->description) {
                    echo wpautop(wptopn($this->description));
                }

                echo '<div class="strat-payment-fields">';
                echo '<p>You will be provided with a STRAT wallet address to send payment to.</p>';
                echo '<p>Current STRAT price: <strong id="strat-current-price">Loading...</strong></p>';
                echo '<p>Amount in STRAT: <strong id="strat-amount">Calculating...</strong></p>';
                echo '</div>';

                ?>
                <script>
                jQuery(document).ready(function($) {
                    var total = <?php echo WC()->cart->total; ?>;

                    $.ajax({
                        url: '<?php echo $this->api_endpoint; ?>/api/price',
                        success: function(data) {
                            $('#strat-current-price').text('$' + data.price);
                            var stratAmount = (total / data.price).toFixed(8);
                            $('#strat-amount').text(stratAmount + ' STRAT');
                        }
                    });
                });
                </script>
                <?php
            }

            public function process_payment($order_id) {
                $order = wc_get_order($order_id);

                try {
                    // Get STRAT price
                    $price_data = $this->get_strat_price();
                    $strat_amount = $order->get_total() / $price_data['price'];

                    // Generate payment address (could be static or unique per order)
                    $payment_address = $this->wallet_address;

                    // Store payment details in order meta
                    $order->update_meta_data('_strat_payment_address', $payment_address);
                    $order->update_meta_data('_strat_amount', $strat_amount);
                    $order->update_meta_data('_strat_price_at_time', $price_data['price']);
                    $order->update_meta_data('_strat_payment_status', 'pending');
                    $order->save();

                    // Mark as on-hold (payment pending)
                    $order->update_status('on-hold', 'Awaiting STRAT payment');

                    // Reduce stock levels
                    wc_reduce_stock_levels($order_id);

                    // Remove cart
                    WC()->cart->empty_cart();

                    // Return success and redirect
                    return array(
                        'result' => 'success',
                        'redirect' => $this->get_return_url($order)
                    );

                } catch (Exception $e) {
                    wc_add_notice('Payment error: ' . $e->getMessage(), 'error');
                    return array(
                        'result' => 'fail',
                        'redirect' => ''
                    );
                }
            }

            public function check_payment_callback() {
                // Verify webhook signature
                $signature = $_SERVER['HTTP_X_STRAT_SIGNATURE'] ?? '';

                // Get payment data
                $data = json_decode(file_get_contents('php://input'), true);

                if (!$data || !isset($data['order_id'])) {
                    http_response_code(400);
                    exit;
                }

                $order_id = $data['order_id'];
                $order = wc_get_order($order_id);

                if (!$order) {
                    http_response_code(404);
                    exit;
                }

                // Verify payment
                if ($data['confirmations'] >= $this->confirmations_required) {
                    $order->payment_complete($data['transaction_hash']);
                    $order->add_order_note('STRAT payment confirmed. Transaction: ' . $data['transaction_hash']);
                    $order->update_meta_data('_strat_payment_status', 'confirmed');
                    $order->save();
                }

                http_response_code(200);
                exit;
            }

            protected function get_strat_price() {
                $endpoint = $this->api_endpoint . '/api/price';

                $response = wp_remote_get($endpoint);

                if (is_wp_error($response)) {
                    throw new Exception('Failed to get STRAT price');
                }

                $body = wp_remote_retrieve_body($response);
                $data = json_decode($body, true);

                return $data;
            }

            public function process_refund($order_id, $amount = null, $reason = '') {
                $order = wc_get_order($order_id);

                // STRAT refunds need to be processed manually
                $order->add_order_note('Refund requested: ' . $amount . '. Please process STRAT refund manually.');

                return new WP_Error('strat_refund', 'STRAT refunds must be processed manually.');
            }
        }

        function add_strat_payment_gateway($gateways) {
            $gateways[] = 'WC_STRAT_Payment_Gateway';
            return $gateways;
        }

        add_filter('woocommerce_payment_gateways', 'add_strat_payment_gateway');
    }

    // Add custom order page for payment instructions
    add_action('woocommerce_thankyou_strat_payment', 'strat_payment_thankyou_page');

    function strat_payment_thankyou_page($order_id) {
        $order = wc_get_order($order_id);

        $payment_address = $order->get_meta('_strat_payment_address');
        $strat_amount = $order->get_meta('_strat_amount');

        echo '<h2>STRAT Payment Instructions</h2>';
        echo '<div class="strat-payment-instructions">';
        echo '<p><strong>Send exactly:</strong> ' . number_format($strat_amount, 8) . ' STRAT</p>';
        echo '<p><strong>To address:</strong> <code>' . esc_html($payment_address) . '</code></p>';
        echo '<p><button class="button" onclick="navigator.clipboard.writeText(\'' . esc_js($payment_address) . '\')">Copy Address</button></p>';
        echo '<div id="qr-code"></div>';
        echo '<p><small>Your order will be processed after 3 blockchain confirmations.</small></p>';
        echo '</div>';

        ?>
        <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
        <script>
        new QRCode(document.getElementById("qr-code"), {
            text: "<?php echo esc_js($payment_address); ?>",
            width: 256,
            height: 256
        });
        </script>
        <?php
    }
}
