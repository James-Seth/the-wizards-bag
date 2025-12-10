// Cart functionality
class CartManager {
    constructor() {
        this.init();
    }

    init() {
        this.updateCartCount();
        this.bindEvents();
        this.loadCartFromStorage();
    }

    // Update cart count in navigation
    async updateCartCount() {
        try {
            const response = await fetch('/cart/count');
            const data = await response.json();
            this.updateCartDisplay(data.totalItems || 0);
        } catch (error) {
            console.error('Error updating cart count:', error);
        }
    }

    // Update cart count display
    updateCartDisplay(count) {
        const cartCountElement = document.getElementById('cart-count');
        const cartItemCountElement = document.getElementById('cart-item-count');
        
        if (cartCountElement) {
            cartCountElement.textContent = count;
            cartCountElement.style.display = count > 0 ? 'inline' : 'none';
        }
        
        if (cartItemCountElement) {
            cartItemCountElement.textContent = count;
        }
    }

    // Add item to cart
    async addToCart(productId, quantity = 1) {
        try {
            this.showLoading(true);
            
            const response = await fetch('/cart/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ 
                    id: productId, 
                    quantity: parseInt(quantity) 
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.updateCartDisplay(data.cart.totalItems);
                this.showMessage('Item added to cart!', 'success');
                this.animateCartIcon();
            } else {
                this.showMessage(data.message || 'Error adding item to cart', 'error');
            }
            
        } catch (error) {
            console.error('Error adding to cart:', error);
            this.showMessage('Error adding item to cart', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Update item quantity
    async updateQuantity(itemId, quantity) {
        try {
            this.showLoading(true);
            
            const response = await fetch(`/cart/update/${itemId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ quantity: parseInt(quantity) })
            });

            const data = await response.json();
            
            if (data.success) {
                this.updateCartDisplay(data.cart.totalItems);
                this.updateCartTotals(data.cart);
                // Removed notification for better UX
            } else {
                this.showMessage(data.message || 'Error updating cart', 'error');
            }
            
        } catch (error) {
            console.error('Error updating cart:', error);
            this.showMessage('Error updating cart', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Remove item from cart
    async removeItem(itemId) {
        if (!confirm('Remove this item from your cart?')) return;
        
        try {
            this.showLoading(true);
            
            const response = await fetch(`/cart/remove/${itemId}`, {
                method: 'DELETE'
            });

            const data = await response.json();
            
            if (data.success) {
                this.updateCartDisplay(data.cart.totalItems);
                this.removeItemFromDOM(itemId);
                this.showMessage('Item removed from cart', 'success');
                
                // Reload page if cart is empty
                if (data.cart.totalItems === 0) {
                    window.location.reload();
                }
            } else {
                this.showMessage(data.message || 'Error removing item', 'error');
            }
            
        } catch (error) {
            console.error('Error removing item:', error);
            this.showMessage('Error removing item', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Clear entire cart
    async clearCart() {
        if (!confirm('Clear all items from your cart?')) return;
        
        try {
            this.showLoading(true);
            
            const response = await fetch('/cart/clear', {
                method: 'DELETE'
            });

            const data = await response.json();
            
            if (data.success) {
                this.updateCartDisplay(0);
                this.showMessage('Cart cleared', 'success');
                window.location.reload();
            } else {
                this.showMessage(data.message || 'Error clearing cart', 'error');
            }
            
        } catch (error) {
            console.error('Error clearing cart:', error);
            this.showMessage('Error clearing cart', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Bind event listeners
    bindEvents() {
        // Add to cart buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.add-to-cart-btn') || e.target.closest('.add-to-cart-btn')) {
                e.preventDefault();
                const btn = e.target.closest('.add-to-cart-btn');
                const productId = btn.dataset.productId;
                const quantityInput = document.querySelector(`#quantity-${productId}`) || 
                                    document.querySelector('.quantity-input');
                const quantity = quantityInput ? quantityInput.value : 1;
                this.addToCart(productId, quantity);
            }
        });

        // Quantity controls
        document.addEventListener('click', (e) => {
            if (e.target.matches('.quantity-btn') || e.target.closest('.quantity-btn')) {
                const btn = e.target.closest('.quantity-btn');
                const action = btn.dataset.action;
                const itemId = btn.dataset.itemId;
                const targetId = btn.dataset.target; // For product pages
                
                // Cart page quantity controls
                if (itemId) {
                    const input = document.querySelector(`.quantity-input[data-item-id="${itemId}"]`);
                    
                    if (input) {
                        let quantity = parseInt(input.value);
                        if (action === 'increase') {
                            quantity += 1;
                        } else if (action === 'decrease' && quantity > 1) {
                            quantity -= 1;
                        }
                        
                        input.value = quantity;
                        this.updateQuantity(itemId, quantity);
                    }
                }
                
                // Product page quantity controls
                if (targetId) {
                    const input = document.getElementById(targetId);
                    
                    if (input) {
                        let quantity = parseInt(input.value);
                        const maxQuantity = parseInt(input.max) || 99;
                        
                        if (action === 'increase' && quantity < maxQuantity) {
                            quantity += 1;
                        } else if (action === 'decrease' && quantity > 1) {
                            quantity -= 1;
                        }
                        
                        input.value = quantity;
                    }
                }
            }
        });

        // Quantity input changes
        document.addEventListener('change', (e) => {
            if (e.target.matches('.quantity-input')) {
                const input = e.target;
                const itemId = input.dataset.itemId;
                const quantity = parseInt(input.value);
                
                if (quantity > 0) {
                    this.updateQuantity(itemId, quantity);
                }
            }
        });

        // Remove item buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.remove-item-btn') || e.target.closest('.remove-item-btn')) {
                const btn = e.target.closest('.remove-item-btn');
                const itemId = btn.dataset.itemId;
                this.removeItem(itemId);
            }
        });

        // Clear cart button
        document.addEventListener('click', (e) => {
            if (e.target.matches('#clear-cart-btn')) {
                this.clearCart();
            }
        });
    }

    // Update cart totals on cart page
    updateCartTotals(cart) {
        const subtotalElement = document.getElementById('cart-subtotal');
        const totalElement = document.getElementById('cart-total');
        
        if (subtotalElement) {
            subtotalElement.textContent = `$${cart.totalPrice.toFixed(2)}`;
        }
        
        if (totalElement) {
            totalElement.textContent = `$${cart.totalPrice.toFixed(2)}`;
        }
    }

    // Remove item from DOM
    removeItemFromDOM(itemId) {
        const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
        if (itemElement) {
            itemElement.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                itemElement.remove();
            }, 300);
        }
    }

    // Animate cart icon
    animateCartIcon() {
        const cartIcon = document.getElementById('cart-link');
        if (cartIcon) {
            cartIcon.style.animation = 'bounce 0.6s ease-in-out';
            setTimeout(() => {
                cartIcon.style.animation = '';
            }, 600);
        }
    }

    // Show loading state
    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    // Show message to user
    showMessage(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `alert alert-${type === 'success' ? 'success' : 'danger'} position-fixed`;
        toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        toast.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2"></i>
                ${message}
                <button type="button" class="btn-close ms-auto" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 3000);
    }

    // Load cart data from localStorage (backup)
    loadCartFromStorage() {
        const savedCount = localStorage.getItem('cartCount');
        if (savedCount) {
            this.updateCartDisplay(parseInt(savedCount));
        }
    }
}

// Initialize cart manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.cartManager = new CartManager();
});

// Add some CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes bounce {
        0%, 20%, 60%, 100% { transform: translateY(0); }
        40% { transform: translateY(-10px); }
        80% { transform: translateY(-5px); }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: scale(0.8); }
    }
    
    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    }
    
    .cart-count {
        font-size: 0.8em;
        margin-left: 5px;
    }
`;
document.head.appendChild(style);