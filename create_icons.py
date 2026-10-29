import os
from PIL import Image, ImageDraw, ImageFont

os.makedirs('assets', exist_ok=True)

def create_app_icon(size=256):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    scale = size / 256.0

    # Soft drop shadow for paper
    shadow_offset_x = int(6 * scale)
    shadow_offset_y = int(12 * scale)
    blur_pad = int(8 * scale)

    # Shadow polygon
    paper_left = int(28 * scale)
    paper_top = int(36 * scale)
    paper_right = int(224 * scale)
    paper_bottom = int(232 * scale)
    corner_r = int(10 * scale)

    # Layered shadow
    for i in range(12, 0, -2):
        alpha = int(12 * (1 - i / 14.0))
        draw.rounded_rectangle(
            [paper_left - i//2 + shadow_offset_x, paper_top + shadow_offset_y,
             paper_right + i//2 + shadow_offset_x, paper_bottom + i + shadow_offset_y],
            radius=corner_r + i,
            fill=(10, 15, 30, alpha)
        )

    # Main Sticky Note Paper (Gradient canary yellow to warm peach yellow)
    # Draw base rounded rect
    draw.rounded_rectangle(
        [paper_left, paper_top, paper_right, paper_bottom],
        radius=corner_r,
        fill=(255, 230, 85, 255)
    )

    # Subtle bottom corner curl / shadow gradient
    curl_size = int(32 * scale)
    draw.polygon([
        (paper_right - curl_size, paper_bottom),
        (paper_right, paper_bottom - curl_size),
        (paper_right, paper_bottom)
    ], fill=(235, 195, 50, 255))
    draw.line([
        (paper_right - curl_size, paper_bottom),
        (paper_right, paper_bottom - curl_size)
    ], fill=(210, 170, 30, 255), width=max(1, int(1.5 * scale)))

    # Washi tape at top center
    tape_w = int(80 * scale)
    tape_h = int(24 * scale)
    tape_left = (size - tape_w) // 2
    tape_top = paper_top - int(8 * scale)

    draw.rounded_rectangle(
        [tape_left, tape_top, tape_left + tape_w, tape_top + tape_h],
        radius=int(3 * scale),
        fill=(255, 120, 100, 210) # coral red washi tape
    )
    # Tape highlight line
    draw.line([
        (tape_left + 4, tape_top + 3),
        (tape_left + tape_w - 4, tape_top + 3)
    ], fill=(255, 255, 255, 100), width=max(1, int(1.5 * scale)))

    # Pushpin or Goal Target in center
    cx = size // 2
    cy = int(136 * scale)
    r = int(52 * scale)

    # Target Outer Ring (Crimson / Coral)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(244, 63, 94, 255))
    # Target Middle Ring (White)
    r2 = int(36 * scale)
    draw.ellipse([cx - r2, cy - r2, cx + r2, cy + r2], fill=(255, 255, 255, 255))
    # Target Inner Ring (Crimson)
    r3 = int(22 * scale)
    draw.ellipse([cx - r3, cy - r3, cx + r3, cy + r3], fill=(244, 63, 94, 255))
    # Bullseye Center (Golden Yellow star/dot)
    r4 = int(9 * scale)
    draw.ellipse([cx - r4, cy - r4, cx + r4, cy + r4], fill=(255, 215, 0, 255))

    # Little paper lines at bottom
    line_y = int(196 * scale)
    draw.line([(paper_left + int(24 * scale), line_y), (paper_right - int(24 * scale), line_y)], fill=(215, 185, 55, 180), width=max(1, int(2 * scale)))
    line_y2 = int(210 * scale)
    draw.line([(paper_left + int(24 * scale), line_y2), (paper_right - int(60 * scale), line_y2)], fill=(215, 185, 55, 180), width=max(1, int(2 * scale)))

    return img

def create_tray_icon(size=32):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    scale = size / 32.0

    # Clean, high-contrast tray sticky note
    pad = int(3 * scale)
    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=int(3 * scale),
        fill=(255, 220, 40, 255),
        outline=(20, 20, 20, 220),
        width=max(1, int(1 * scale))
    )

    # Red pin on top
    pin_x = size // 2
    pin_y = pad + int(4 * scale)
    draw.ellipse([pin_x - 3, pin_y - 3, pin_x + 3, pin_y + 3], fill=(239, 68, 68, 255))

    # Center target dot
    cx = size // 2
    cy = int(19 * scale)
    draw.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=(30, 41, 59, 255))
    draw.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=(255, 255, 255, 255))

    return img

# Generate icons
icon_256 = create_app_icon(256)
icon_256.save('assets/icon.png', 'PNG')

tray_32 = create_tray_icon(32)
tray_32.save('assets/tray-icon.png', 'PNG')

# Save ICO file containing multiple resolutions for Windows
icon_256.save('assets/icon.ico', format='ICO', sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])

print("Icons created successfully!")
