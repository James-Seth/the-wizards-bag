/**
 * Product pages (listing and detail)
 *
 * This used to be inline <script> blocks and an onclick="..." attribute in the
 * EJS templates. Keeping all JavaScript in files lets the Content Security Policy
 * forbid inline scripts entirely, so even if an attacker managed to inject HTML
 * into a page, the browser would refuse to run any script they slipped in.
 */

document.addEventListener('DOMContentLoaded', function () {
    // Add to cart. One listener on the whole page ("event delegation") catches clicks
    // on every .add-to-cart-btn, on both the listing and the detail page.
    document.addEventListener('click', function (event) {
        const button = event.target.closest('.add-to-cart-btn');
        if (!button) return;
        event.preventDefault();

        const productId = button.dataset.productId;
        // The detail page has a quantity box with id="quantity-<productId>";
        // the listing page doesn't, so it adds 1.
        const quantityInput = document.getElementById(`quantity-${productId}`);
        const quantity = quantityInput ? parseInt(quantityInput.value, 10) || 1 : 1;

        if (window.CartManager) {
            window.CartManager.addToCart(productId, quantity);
        } else {
            alert('Cart functionality is not available at this time.');
        }
    });

    // + / - buttons next to the quantity box on the detail page.
    // (Buttons on the cart page are handled by cart.js; these ones carry data-action.)
    document.querySelectorAll('.quantity-btn[data-action]').forEach(function (button) {
        button.addEventListener('click', function () {
            const input = document.getElementById(button.dataset.target);
            if (!input) return;

            const current = parseInt(input.value, 10) || 1;
            const min = parseInt(input.min, 10) || 1;
            const max = parseInt(input.max, 10) || 999;

            if (button.dataset.action === 'increase' && current < max) input.value = current + 1;
            if (button.dataset.action === 'decrease' && current > min) input.value = current - 1;
        });
    });
});