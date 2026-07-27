# External knight model

Cube Chess 512 loads the knight mesh from the Khronos glTF Sample Assets model **A Beautiful Game**.

- Source model: `KhronosGroup/glTF-Sample-Assets/Models/ABeautifulGame`
- Original geometry: Moeen Sayed and Mujtaba Sayed for SideFX / Academy Software Foundation
- glTF conversion: Ed Mackey
- License: Creative Commons Attribution 4.0 International (CC BY 4.0)
- Pinned source revision: `2bac6f8c57bf471df0d2a1e8a8ec023c7801dddf`
- Runtime asset URL: jsDelivr mirror of the pinned Khronos GLB

The game extracts only the `Knight_W` or `Knight_B` mesh, removes the source-board transform, normalizes it to the Cube Chess cell scale and applies the local white or black material.

The previous procedural knight remains only as an offline/loading fallback. It is replaced automatically after the licensed glTF mesh finishes loading.

License text: https://creativecommons.org/licenses/by/4.0/
Source documentation: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/ABeautifulGame
