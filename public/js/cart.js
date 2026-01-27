/**
 * Cart Frontend JavaScript - Session-Based
 * Handles cart interactions and AJAX updates
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize cart functionality
    initializeCartSystem();
    
    // Load cart count on page load
    if (window.CartManager) {
        window.CartManager.fetchCartCount();
    }
});

/**
 * Refresh inventory displays on product pages after cart changes
 */
function refreshInventoryDisplays() {
    // Check if we're on a product page
    const isProductPage = window.location.pathname.includes('/products');
    
    if (isProductPage) {
        // Reload the page to get updated inventory
        setTimeout(() => {
            window.location.reload();
        }, 500); // Small delay to ensure cart update completed
    }
}

function initializeCartSystem() {
    // Cart interaction elements
    const quantityInputs = document.querySelectorAll('.quantity-input');
    const quantityButtons = document.querySelectorAll('.quantity-btn');
    const removeButtons = document.querySelectorAll('.remove-item-btn');
    const clearCartButton = document.getElementById('clear-cart-btn');
    
    /**
     * Show loading state on button
     */
    function setButtonLoading(button, loading = true) {
        if (loading) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.textContent = '...';
        } else {
            button.disabled = false;
            button.textContent = button.dataset.originalText || button.textContent;
        }
    }

    /**
     * Update cart display with new data
     */
    function updateCartDisplay(cartData) {
        // Update item count in cart page
        const itemCountElement = document.getElementById('cart-item-count');
        if (itemCountElement) {
            itemCountElement.textContent = cartData.totalItems;
        }

        // Update subtotal and total in cart page
        const subtotalElement = document.getElementById('cart-subtotal');
        const totalElement = document.getElementById('cart-total');
        if (subtotalElement) {
            subtotalElement.textContent = `$${cartData.totalPrice.toFixed(2)}`;
        }
        if (totalElement) {
            totalElement.textContent = `$${cartData.totalPrice.toFixed(2)}`;
        }

        // Update navbar cart badge
        const cartBadge = document.getElementById('cart-count');
        if (cartBadge) {
            cartBadge.textContent = cartData.totalItems;
            cartBadge.style.display = cartData.totalItems > 0 ? 'inline' : 'none';
        }
    }

    /**
     * Show success/error message
     */
    function showMessage(message, type = 'success') {
        // Remove existing messages
        const existingMessage = document.querySelector('.cart-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `cart-message alert alert-${type === 'success' ? 'success' : 'danger'} position-fixed`;
        messageDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        messageDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2"></i>
                ${message}
                <button type="button" class="btn-close ms-auto" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;
        
        document.body.appendChild(messageDiv);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 3000);
    }

    /**
     * Update quantity in cart
     */
    function updateQuantity(productId, newQuantity, button) {
        setButtonLoading(button, true);

        fetch(`/cart/update/${productId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ quantity: newQuantity })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showMessage(data.message, 'success');
                updateCartDisplay(data.cart);

                // Reload page if cart is empty
                if (data.cart.totalItems === 0) {
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                }
            } else {
                showMessage(data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error updating cart:', error);
            showMessage('Error updating cart', 'error');
        })
        .finally(() => {
            setButtonLoading(button, false);
        });
    }

    /**
     * Remove item from cart
     */
    function removeItem(productId, button) {
        if (!confirm('Remove this item from your cart?')) {
            return;
        }

        setButtonLoading(button, true);

        fetch(`/cart/remove/${productId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Remove item from display with animation
                const cartItem = document.querySelector(`[data-product-id="${productId}"]`);
                if (cartItem) {
                    cartItem.style.transition = 'opacity 0.3s, transform 0.3s';
                    cartItem.style.opacity = '0';
                    cartItem.style.transform = 'scale(0.8)';
                    setTimeout(() => {
                        cartItem.remove();
                    }, 300);
                }
                
                showMessage(data.message, 'success');
                updateCartDisplay(data.cart);

                // Reload page if cart is empty
                if (data.cart.totalItems === 0) {
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                }
            } else {
                showMessage(data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error removing item:', error);
            showMessage('Error removing item', 'error');
        })
        .finally(() => {
            setButtonLoading(button, false);
        });
    }

    /**
     * Clear entire cart
     */
    function clearCart() {
        if (!confirm('Remove all items from your cart?')) {
            return;
        }

        setButtonLoading(clearCartButton, true);

        fetch('/cart/clear', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showMessage(data.message, 'success');
                
                // Reload page after short delay
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                showMessage(data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error clearing cart:', error);
            showMessage('Error clearing cart', 'error');
        })
        .finally(() => {
            setButtonLoading(clearCartButton, false);
        });
    }

    // Event Listeners for Cart Page

    // Quantity input changes
    quantityInputs.forEach(input => {
        input.addEventListener('change', function() {
            const productId = this.dataset.productId;
            const newQuantity = parseInt(this.value);
            
            if (newQuantity < 1) {
                this.value = 1;
                return;
            }
            if (newQuantity > 99) {
                this.value = 99;
                return;
            }
            
            updateQuantity(productId, newQuantity, this);
        });
    });

    // Quantity buttons (+ and -)
    quantityButtons.forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.dataset.productId;
            const input = document.querySelector(`input[data-product-id="${productId}"]`);
            
            if (!input) return;
            
            let currentQuantity = parseInt(input.value);
            
            if (this.classList.contains('increase-qty')) {
                if (currentQuantity < 99) {
                    currentQuantity++;
                    input.value = currentQuantity;
                    updateQuantity(productId, currentQuantity, this);
                }
            } else if (this.classList.contains('decrease-qty')) {
                if (currentQuantity > 1) {
                    currentQuantity--;
                    input.value = currentQuantity;
                    updateQuantity(productId, currentQuantity, this);
                }
            }
        });
    });

    // Remove item buttons
    removeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.dataset.productId;
            removeItem(productId, this);
        });
    });

    // Clear cart button
    if (clearCartButton) {
        clearCartButton.addEventListener('click', clearCart);
    }
}

// Global Cart Manager for use from product pages
window.CartManager = {
    /**
     * Add item to cart from product page
     */
    addToCart: function(productId, quantity = 1) {
        console.log('🛒 CartManager.addToCart called:', { productId, quantity });
        
        const button = document.querySelector(`[data-product-id="${productId}"]`) || 
                      document.querySelector('.add-to-cart-btn');
        
        console.log('🔍 Found button:', button);
        
        if (button) {
            button.disabled = true;
            button.textContent = 'Adding...';
        }

        const requestData = { 
            id: productId, 
            quantity: quantity 
        };
        
        console.log('📤 Sending request to /cart/add:', requestData);

        return fetch('/cart/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        })
        .then(response => {
            console.log('📥 Response status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('📦 Response data:', data);
            
            if (data.success) {
                // Update cart count
                console.log('✅ Success! Updating cart count to:', data.cart.totalItems);
                this.updateCartCount(data.cart.totalItems);
                
                // Show success message
                this.showMessage(data.message, 'success');
                
                // Add cart icon bounce animation
                this.animateCartIcon();
                
                // Refresh inventory displays on product pages
                refreshInventoryDisplays();
                
                return data;
            } else {
                console.error('❌ Cart add failed:', data.message);
                this.showMessage(data.message, 'error');
                throw new Error(data.message);
            }
        })
        .catch(error => {
            console.error('🚨 Error adding to cart:', error);
            this.showMessage('Error adding item to cart', 'error');
            throw error;
        })
        .finally(() => {
            if (button) {
                button.disabled = false;
                button.textContent = 'Add to Cart';
            }
        });
    },

    /**
     * Update cart count in navbar
     */
    updateCartCount: function(count) {
        console.log('🔢 updateCartCount called with:', count);
        
        const cartBadge = document.getElementById('cart-count');
        console.log('🎯 Found cart badge element:', cartBadge);
        
        if (cartBadge) {
            cartBadge.textContent = count;
            cartBadge.style.display = count > 0 ? 'inline' : 'none';
            
            console.log('🎨 Updated badge - text:', cartBadge.textContent, 'display:', cartBadge.style.display);
            
            // Add animation effect
            cartBadge.classList.add('cart-count');
            setTimeout(() => cartBadge.classList.remove('cart-count'), 600);
        } else {
            console.error('❌ Cart badge element not found! Looking for #cart-count');
        }
    },

    /**
     * Fetch and update cart count
     */
    fetchCartCount: async function() {
        try {
            const response = await fetch('/cart/count');
            const data = await response.json();
            
            if (data.success) {
                this.updateCartCount(data.totalItems);
            }
        } catch (error) {
            console.error('Error fetching cart count:', error);
        }
    },

    /**
     * Show success/error message
     */
    showMessage: function(message, type = 'success') {
        // Remove existing messages
        const existingMessage = document.querySelector('.cart-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `cart-message alert alert-${type === 'success' ? 'success' : 'danger'} position-fixed`;
        messageDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        messageDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2"></i>
                ${message}
                <button type="button" class="btn-close ms-auto" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;
        
        document.body.appendChild(messageDiv);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 3000);
    },

    /**
     * Animate cart icon when item is added
     */
    animateCartIcon: function() {
        const cartIcon = document.querySelector('#cart-link') || 
                        document.querySelector('.cart-icon') ||
                        document.querySelector('[href="/cart"]');
        
        if (cartIcon) {
            cartIcon.style.animation = 'cartBounce 0.6s ease-in-out';
            setTimeout(() => {
                cartIcon.style.animation = '';
            }, 600);
        }
    }
};

// Add cart bounce animation CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes cartBounce {
        0%, 20%, 60%, 100% { transform: translateY(0) scale(1); }
        40% { transform: translateY(-10px) scale(1.1); }
        80% { transform: translateY(-5px) scale(1.05); }
    }
`;
document.head.appendChild(style);