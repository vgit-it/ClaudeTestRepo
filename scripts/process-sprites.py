from PIL import Image
import numpy as np

SRC = "/root/.claude/uploads/02320042-dadb-437b-a1b7-39e80854c2e5"
DST = "/home/user/ClaudeTestRepo/public/assets/sprites"
FW, FH, ROWS = 138, 111, 8

sheets = {
    "char_walk":  ("019dc2cf-CharWalk.png",  14),
    "char_atk":   ("019dc2cf-CharAtk.png",   14),
    "char_death": ("019dc2cf-CharDeath.png",  11),
    "char_block": ("019dc2d0-CharBlock.png",  10),
}

def remove_bg(frame: np.ndarray) -> np.ndarray:
    r, g, b = frame[:, :, 0], frame[:, :, 1], frame[:, :, 2]

    # Pass 1: remove clearly-white background pixels globally within this frame
    white = (r > 230) & (g > 230) & (b > 230)
    frame[white, 3] = 0

    # Pass 2: erode 1 pixel — remove near-white pixels that are adjacent to transparent,
    # i.e. the anti-aliased blend at the character silhouette edge.
    h, w = frame.shape[:2]
    transparent = frame[:, :, 3] == 0
    adj = np.zeros((h, w), dtype=bool)
    adj[1:,  :] |= transparent[:-1, :]
    adj[:-1, :] |= transparent[1:,  :]
    adj[:,  1:] |= transparent[:,  :-1]
    adj[:, :-1] |= transparent[:,   1:]

    near_white = (r > 210) & (g > 210) & (b > 210)
    frame[adj & ~transparent & near_white, 3] = 0

    # Zero out RGB of all transparent pixels so WebGL bilinear filtering
    # cannot bleed the original white background colour into opaque neighbours.
    fully_transparent = frame[:, :, 3] == 0
    frame[fully_transparent, 0] = 0
    frame[fully_transparent, 1] = 0
    frame[fully_transparent, 2] = 0

    return frame

for out_name, (src_file, cols) in sheets.items():
    img = Image.open(f"{SRC}/{src_file}").convert("RGBA")
    data = np.array(img, dtype=np.uint8)
    cropped = data[:ROWS * FH, :cols * FW, :].copy()
    for row in range(ROWS):
        for col in range(cols):
            y0, x0 = row * FH, col * FW
            frame = cropped[y0:y0 + FH, x0:x0 + FW, :].copy()
            cropped[y0:y0 + FH, x0:x0 + FW, :] = remove_bg(frame)
    Image.fromarray(cropped, "RGBA").save(f"{DST}/{out_name}.png")
    print(f"  {out_name}.png saved")
