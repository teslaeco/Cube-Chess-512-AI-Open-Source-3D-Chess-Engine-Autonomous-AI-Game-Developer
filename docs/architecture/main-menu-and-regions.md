# Main Menu and Planned Server Regions

## Menu structure

The application opens with a professional start menu over the 3D scene.

1. **New Game**
   - local two-player
   - player versus computer
   - player versus AI
   - tutorial
   - side selection: White, Black, Random
   - difficulty
   - optional clock

2. **Save**
   - create local save
   - load save
   - export and import JSON
   - replay and future 3D FEN/PGN integration

3. **Online**
   - region selection
   - lobby architecture
   - all regions visibly marked as under construction until a real backend is deployed

4. **Settings**
   - Sound
   - Graphics
   - Controls
   - Server
   - Language
   - Accessibility
   - Advanced

5. **Subscribe**
   - Cube Chess Pro concept
   - no active payment claims until implemented
   - no competitive pay-to-win benefits

6. **License**
   - repository license
   - third-party dependencies
   - asset attribution

7. **Help**
   - movement guide
   - camera controls
   - cross-level play
   - FAQ
   - GitHub issue reporting
   - email: [xodobrox@gmail.com](mailto:xodobrox@gmail.com)

8. **About**
   - authorship and open-source status
   - Terraforming Planet mission
   - responsible AI and environmental research vision
   - thanks to OpenAI without implying partnership or endorsement

## Region list shown in Settings and Online

The UI must display exactly:

1. **Arctic** — Option under construction
2. **Europe** — Option under construction
3. **Asia** — Option under construction
4. **Africa** — Option under construction
5. **North America** — Option under construction
6. **South America** — Option under construction
7. **Australia** — Option under construction
8. **Antarctica** — Option under construction

The UI must not call these active servers until real infrastructure exists. Internally they are `ServerRegion` configuration values for future matchmaking.

## Accessibility

- keyboard navigation
- touch navigation
- visible focus
- semantic controls
- ARIA labels
- Escape closes the active panel
- minimum 44×44 px touch targets
- RTL-safe layout

## Demo background

Before a player starts a game, a separate demo controller may run legal moves in the background. It must stop and dispose resources when a real game begins.
