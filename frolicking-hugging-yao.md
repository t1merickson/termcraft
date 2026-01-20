# 256 ANSI Color Wheel

## Goal
Replace the current hue×luminance grid with a color wheel visualization that naturally organizes colors by hue angle.

## Design

### Layout
```
     ┌────────────────────────────┐
     │                            │
     │       COLOR WHEEL          │
     │    (chromatic colors       │
     │     arranged by hue)       │
     │                            │
     └────────────────────────────┘

     ┌────────────────────────────┐
     │  GRAYSCALE STRIP           │
     │  ■ ■ ■ ■ ■ ■ ... ■ ■ ■    │
     │  black → white             │
     └────────────────────────────┘
```

### Color Wheel Structure
- **Hue angle**: Position around the circle (0°=red at right, 120°=green, 240°=blue)
- **Radial distance**: Based on luminance - darker colors near center, brighter on outer edge
- Colors with same hue but different saturation/luminance form radial spokes

### Grayscale Strip (below wheel)
- Horizontal row with all grayscale colors
- Black (0) on left → White (255) on right
- Includes: 0, 7, 8, 15, 16, 59, 102, 145, 188, 231, 232-255

### Implementation
- Container: 600×600px wheel area + grayscale strip below
- For each chromatic color:
  - `angle = hue * (Math.PI / 180)`
  - `radius = minRadius + (luminance / 100) * (maxRadius - minRadius)`
  - `x = centerX + radius * Math.cos(angle)`
  - `y = centerY - radius * Math.sin(angle)`
- Position each color swatch absolutely using CSS transforms
- Color cells: 20×20px squares positioned by center point

### Preserved Features
- Tooltip on hover (showing ANSI code, name, hex, RGB, HSL, escape code)
- Click-to-copy escape code
- Toast notification on copy
- Legend explaining color ranges
- Attribution to jonasjacek/colors

## File to Modify
- `/Users/tim/Developer/Claude/256-ANSI/index.html` - complete rewrite of visualization logic and CSS

## Verification
1. Open http://127.0.0.1:8766/index.html in browser
2. Verify wheel shows chromatic colors arranged by hue angle
3. Verify grayscale strip shows blacks → grays → whites left to right
4. Confirm all 256 colors are visible and clickable
5. Test tooltip appears on hover with correct information
6. Test click-to-copy functionality works
