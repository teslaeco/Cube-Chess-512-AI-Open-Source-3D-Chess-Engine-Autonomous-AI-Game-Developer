# Cube board coordinate system

Cube Chess 512 is a spatial board, not eight flat boards placed beside each
other. It has `x` for files `a`–`h`, `y` for ranks `1`–`8`, and `z` for the
vertical levels `A`–`H`. Each level contains 64 squares and all eight levels
are stacked vertically, yielding 8 × 8 × 8 = 512 squares.

Addresses always use `Level:algebraic`, for example `A:a1`, `A:e4`, `D:e4`,
and `H:h8`. The browser coordinate module validates each numeric axis from 0
through 7 and maps it to this address. `boardPosition()` maps logical `x` and
rank to the horizontal Three.js plane and maps `z` to vertical world height
using `LEVEL_SPACING`. Thus `D:e4` is physically above `A:e4`, not beside it.

The renderer may fade board squares based on their distance from the active
level, but pieces remain opaque. This is a presentation policy only; it does
not alter the logical coordinate system or game rules.
