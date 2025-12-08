document.getElementById('orderForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        customerName: document.getElementById('customerName').value,
        email: document.getElementById('email').value,
        street: document.getElementById('street').value,
        city: document.getElementById('city').value,
        state: document.getElementById('state').value,
        zipCode: document.getElementById('zipCode').value,
        country: document.getElementById('country').value,
        boxType: document.getElementById('boxType').value,
        quantity: document.getElementById('quantity').value,
        notes: document.getElementById('notes').value
    };

    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            alert('Order submitted successfully!');
            document.getElementById('orderForm').reset();
        } else {
            alert('Error submitting order: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error submitting order. Please try again.');
    }
});