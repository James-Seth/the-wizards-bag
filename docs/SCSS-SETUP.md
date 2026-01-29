# SCSS Setup Documentation

## File Structure
```
public/scss/
├── style.scss          # Main file (imports all modules)
├── _variables.scss     # Design system variables
├── _mixins.scss        # Reusable mixins
├── _base.scss          # Global styles & animations
├── _navbar.scss        # Navigation styles
├── _hero.scss          # Hero section styles
├── _products.scss      # Product display styles
├── _cart.scss          # Shopping cart styles
└── _responsive.scss    # Mobile-first responsive design
```

## NPM Scripts
- `npm run css:build` - Build compressed CSS for production
- `npm run css:watch` - Watch for SCSS changes and auto-rebuild
- `npm run css:dev` - Build expanded CSS with source maps for development
- `npm run dev` - Start server with CSS watching (updated)

## Key Features

### Variables (`_variables.scss`)
- Consistent color palette
- Standardized spacing system
- Typography scales
- Breakpoint definitions

### Mixins (`_mixins.scss`)
- Flexbox utilities
- Button styles
- Card styles
- Hover effects
- Responsive breakpoints

### Benefits
✅ **Modular Organization** - Easy to find and edit specific styles
✅ **Design System** - Consistent spacing, colors, and typography
✅ **DRY Principle** - No more repeated CSS patterns
✅ **Maintainable** - Easy to update global styles
✅ **Scalable** - Simple to add new components

## Development Workflow
1. Edit SCSS files in `public/scss/`
2. Run `npm run css:watch` for auto-compilation
3. Or use `npm run dev` to start server with CSS watching

## File Locations
- Source: `public/scss/*.scss`
- Compiled: `public/css/style.css`
- Backup: `public/css/style-backup.css` (original CSS)
