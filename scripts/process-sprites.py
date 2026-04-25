from PIL import Image
import numpy as np
from collections import deque

SRC = "/root/.claude/uploads/02320042-dadb-437b-a1b7-39e80854c2e5"
DST = "/home/user/ClaudeTestRepo/public/assets/sprites"
FW, FH, ROWS = 138, 111, 8
THRESHOLD = 210  # catches anti-aliased edge pixels that 230 misses

sheets = {
    "char_walk":  ("019dc2cf-CharWalk.png",  14),
    "char_atk":   ("019dc2cf-CharAtk.png",   14),
    "char_death": ("019dc2cf-CharDeath.png",  11),
    "char_block": ("019dc2d0-CharBlock.png",  10),
}

def flood_fill_bg(frame: np.ndarray, threshold: int) -> np.ndarray:
    """BFS from all border pixels; removes only connected near-white background."""
    h, w = frame.shape[:2]
    r, g, b = frame[:, :, 0], frame[:, :, 1], frame[:, :, 2]
    near_white = (r > threshold) & (g > threshold) & (b > threshold)
    visited = np.zeros((h, w), dtype=bool)
    queue = deque()
    for x in range(w):
        for y in [0, h - 1]:
            if near_white[y, x] and not visited[y, x]:
                queue.append((y, x))
                visited[y, x] = True
    for y in range(h):
        for x in [0, w - 1]:
            if near_white[y, x] and not visited[y, x]:
                queue.append((y, x))
                visited[y, x] = True
    while queue:
        y, x = queue.popleft()
        frame[y, x, 3] = 0
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and near_white[ny, nx]:
                visited[ny, nx] = True
                queue.append((ny, nx))
    return frame

for out_name, (src_file, cols) in sheets.items():
    img = Image.open(f"{SRC}/{src_file}").convert("RGBA")
    data = np.array(img, dtype=np.uint8)
    cropped = data[:ROWS * FH, :cols * FW, :].copy()
    for row in range(ROWS):
        for col in range(cols):
            y0, x0 = row * FH, col * FW
            frame = cropped[y0:y0 + FH, x0:x0 + FW, :].copy()
            cropped[y0:y0 + FH, x0:x0 + FW, :] = flood_fill_bg(frame, THRESHOLD)
    Image.fromarray(cropped, "RGBA").save(f"{DST}/{out_name}.png")
    print(f"  {out_name}.png saved")
