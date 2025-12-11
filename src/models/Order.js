const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    productImage: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    subtotal: {
        type: Number,
        required: true,
        min: 0
    }
});

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    customer: {
        name: {
            type: String,
            required: true,
            trim: true,
            maxLength: 100
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
        },
        phone: {
            type: String,
            required: true,
            trim: true,
            match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
        }
    },
    shippingAddress: {
        street: {
            type: String,
            required: true,
            trim: true,
            maxLength: 255
        },
        city: {
            type: String,
            required: true,
            trim: true,
            maxLength: 100
        },
        state: {
            type: String,
            required: true,
            trim: true,
            maxLength: 100
        },
        zipCode: {
            type: String,
            required: true,
            trim: true,
            match: [/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code']
        },
        country: {
            type: String,
            required: true,
            trim: true,
            default: 'United States'
        }
    },
    items: [OrderItemSchema],
    totals: {
        subtotal: {
            type: Number,
            required: true,
            min: 0
        },
        tax: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },
        shipping: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },
        total: {
            type: Number,
            required: true,
            min: 0
        }
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    orderDate: {
        type: Date,
        default: Date.now
    },
    notes: {
        type: String,
        maxLength: 500
    },
    // Legacy fields for backward compatibility
    customerName: {
        type: String
    },
    boxType: {
        type: String
    },
    quantity: {
        type: Number
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Generate unique order number before saving
orderSchema.pre('save', async function(next) {
    if (this.isNew && !this.orderNumber) {
        this.orderNumber = await this.constructor.generateOrderNumber();
    }
    next();
});

// Generate order number format: WB-YYYYMMDD-XXXX
orderSchema.statics.generateOrderNumber = async function() {
    const now = new Date();
    const dateStr = now.getFullYear().toString() + 
                   (now.getMonth() + 1).toString().padStart(2, '0') + 
                   now.getDate().toString().padStart(2, '0');
    
    // Find the highest order number for today
    const orderPrefix = `WB-${dateStr}-`;
    const lastOrder = await this.findOne({
        orderNumber: new RegExp(`^${orderPrefix}`)
    }).sort({ orderNumber: -1 });
    
    let sequence = 1;
    if (lastOrder) {
        const lastSequence = parseInt(lastOrder.orderNumber.slice(-4));
        sequence = lastSequence + 1;
    }
    
    return `${orderPrefix}${sequence.toString().padStart(4, '0')}`;
}

// Virtual for formatted order date
orderSchema.virtual('formattedOrderDate').get(function() {
    return this.orderDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
});

// Virtual for total item count
orderSchema.virtual('totalItems').get(function() {
    return this.items ? this.items.reduce((total, item) => total + item.quantity, 0) : 0;
});

// Index for better query performance
orderSchema.index({ orderDate: -1 });
orderSchema.index({ 'customer.email': 1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model('Order', orderSchema);