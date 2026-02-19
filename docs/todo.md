Core:
- Reorg
- Escape hatch
- Portrait mode
- Debug workflow in CLI

Design:
- function cardDefaults(theme: Theme): CardTokens {: is this right? Or should always have a default theme and throw if not defined.
- Theme building in CLI (inc. JSON design tokens)
- Where to put html / pptx?
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