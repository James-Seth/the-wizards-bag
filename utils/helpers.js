/**
 * Format price to currency string
 * @param {number} price - Price in decimal format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted price string
 */
const formatPrice = (price, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(price);
};

/**
 * Format category name for display
 * @param {string} category - Category slug (e.g., 'deck-boxes')
 * @returns {string} Formatted category name (e.g., 'Deck Boxes')
 */
const formatCategory = (category) => {
  return category
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @param {string} suffix - Suffix to add (default: '...')
 * @returns {string} Truncated text
 */
const truncateText = (text, length = 100, suffix = '...') => {
  if (!text || text.length <= length) return text;
  return text.substring(0, length).trim() + suffix;
};

/**
 * Generate slug from text
 * @param {string} text - Text to slugify
 * @returns {string} URL-friendly slug
 */
const slugify = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Check if string is valid MongoDB ObjectId
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid ObjectId
 */
const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Calculate pagination info
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 * @returns {object} Pagination info
 */
const calculatePagination = (page = 1, limit = 12, total = 0) => {
  const currentPage = Math.max(1, parseInt(page));
  const itemsPerPage = Math.min(limit, 50); // Max 50 items per page
  const totalPages = Math.ceil(total / itemsPerPage);
  const skip = (currentPage - 1) * itemsPerPage;
  
  return {
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems: total,
    skip,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
    nextPage: currentPage < totalPages ? currentPage + 1 : null,
    prevPage: currentPage > 1 ? currentPage - 1 : null
  };
};

module.exports = {
  formatPrice,
  formatCategory,
  truncateText,
  slugify,
  isValidObjectId,
  calculatePagination
};