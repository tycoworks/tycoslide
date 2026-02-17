Core:
- Reorg
- Escape hatch
- Portrait mode
- Debug workflow in CLI

Markdown:
- Get rid of contentLayout. Make it impossible to make non-markdownable layouts.
- Day AI example - body vs params
- YAML input vs params
- How does block / body work?
- Shared slides / presentation packs in markdown?

Design:
- function cardDefaults(theme: Theme): CardTokens {: is this right? Or should always have a default theme and throw if not defined.
- Theme building in CLI (inc. JSON design tokens)
- Theme package (npm?) & version
- Masters?
- Dark mode
- Design principles
-- Direction is opposite to container?
-- Content rules
-- Image cover
- Build theme from PPTX?

Cleanup:
- Fixed percentages and slide size
- Right align bullet points

Components:
- Image to the left of the card / direction and justify
- Code component
- Real mermaid (or embed diagram as alt)
- Groups