const { formatPrice, formatCategory, truncateText, slugify, isValidObjectId } = require('../utils/helpers');

describe('Helper Functions', () => {
  describe('formatPrice', () => {
    test('should format price correctly', () => {
      expect(formatPrice(29.99)).toBe('$29.99');
      expect(formatPrice(100)).toBe('$100.00');
      expect(formatPrice(0.99)).toBe('$0.99');
    });
  });

  describe('formatCategory', () => {
    test('should format category names', () => {
      expect(formatCategory('deck-boxes')).toBe('Deck Boxes');
      expect(formatCategory('tokens')).toBe('Tokens');
      expect(formatCategory('accessories')).toBe('Accessories');
    });
  });

  describe('truncateText', () => {
    test('should truncate long text', () => {
      const longText = 'This is a very long text that should be truncated';
      expect(truncateText(longText, 20)).toBe('This is a very long...');
    });

    test('should not truncate short text', () => {
      const shortText = 'Short text';
      expect(truncateText(shortText, 20)).toBe('Short text');
    });
  });

  describe('slugify', () => {
    test('should create URL-friendly slugs', () => {
      expect(slugify('Premium Deck Box')).toBe('premium-deck-box');
      expect(slugify('Metal Life Counters!')).toBe('metal-life-counters');
    });
  });

  describe('isValidObjectId', () => {
    test('should validate MongoDB ObjectIds', () => {
      expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
      expect(isValidObjectId('invalid-id')).toBe(false);
      expect(isValidObjectId('123')).toBe(false);
    });
  });
});