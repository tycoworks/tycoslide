# Component Grouping in PowerPoint

https://github.com/Pitchlyapp/PptxGenJSGroups

> **Status:** Parked - pptxgenjs doesn't support grouping natively, implementation deferred.

## Problem

When rendering components like Card, each element (background, image, title, description) is added as a separate shape in PowerPoint. In the Selection Pane, you see:
- Rectangle 1
- Picture 2
- TextBox 3
- TextBox 4

Instead, we want these to be grouped so they appear as a single "Card" object that can be selected and moved together.

## Design Decisions

- **Approach:** Post-process PPTX (preserves raw pptxgenjs escape hatch)
- **Scope:** All composite components (Card, Table) grouped automatically
- **Nesting:** Flat groups only (Row of 3 Cards = 3 separate groups, not nested)

---

## Technical Context

### pptxgenjs Limitations
- **No native group support** - [Issue #307](https://github.com/gitbrent/PptxGenJS/issues/307) open since 2018
- `objectName` property available on all shapes for identification

### OOXML Group Structure
PowerPoint groups are stored as `<p:grpSp>` elements in slide XML:
```xml
<p:grpSp>
  <p:nvGrpSpPr>
    <p:cNvPr id="5" name="Card 1"/>
    <p:cNvGrpSpPr/>
    <p:nvPr/>
  </p:nvGrpSpPr>
  <p:grpSpPr>
    <a:xfrm>
      <a:off x="914400" y="914400"/>      <!-- Group position (EMUs) -->
      <a:ext cx="1828800" cy="914400"/>   <!-- Group size -->
      <a:chOff x="914400" y="914400"/>    <!-- Child coordinate origin -->
      <a:chExt cx="1828800" cy="914400"/> <!-- Child coordinate extent -->
    </a:xfrm>
  </p:grpSpPr>
  <!-- Child shapes moved inside -->
  <p:sp>...</p:sp>
  <p:pic>...</p:pic>
</p:grpSp>
```

Key insight: Child shapes keep their absolute coordinates. The `chOff`/`chExt` define the coordinate system for children, typically matching the group's bounding box.

---

## Implementation Plan

### Step 1: Add Group ID Generation

Create a utility for generating unique group IDs per component instance.

**File:** `core/utils.ts`
```typescript
let groupCounter = 0;

export function generateGroupId(prefix: string): string {
  return `${prefix}-${++groupCounter}`;
}

export function resetGroupCounter(): void {
  groupCounter = 0;
}
```

### Step 2: Update Card Component

Add `objectName` to all shapes with group prefix. Parent component generates the groupId and passes it down to child components.

**File:** `core/components/Card.ts`

```typescript
import { generateGroupId } from '../utils.js';

// In prepare():
const groupId = generateGroupId('card');

return (slide) => {
  if (showBackground) {
    slide.addShape('roundRect', {
      ...backgroundOpts,
      objectName: `${groupId}:background`
    });
  }
  // Child components receive groupId and use it for their objectName
  if (imageDrawer) imageDrawer(slide);
  if (titleDrawer) titleDrawer(slide);
  if (descDrawer) descDrawer(slide);
};
```

### Step 3: Update Text and Image Components

Add optional `objectName` prop that parent components can pass down.

**File:** `core/components/Text.ts`
```typescript
export interface TextProps {
  // ... existing props
  objectName?: string;  // For grouping support
}

// In prepare() drawer:
slide.addText(content, {
  ...opts,
  objectName: this.props.objectName
});
```

**File:** `core/components/Image.ts`
```typescript
export interface ImageProps {
  // ... existing props
  objectName?: string;
}

// In prepare() drawer:
slide.addImage({
  ...opts,
  objectName: this.props.objectName
});
```

### Step 4: Update Table Component

Similar pattern - add objectName to all border lines and cell content.

**File:** `core/components/Table.ts`
```typescript
const groupId = generateGroupId('table');

// In drawBorders():
slide.addShape('line', {
  ...lineOpts,
  objectName: `${groupId}:border-h-${i}`
});

// Cell drawers need groupId passed through normalizeCell
```

### Step 5: Create PPTX Post-Processor

**File:** `core/grouper.ts`

```typescript
import AdmZip from 'adm-zip';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

export async function groupShapesInPptx(filePath: string): Promise<void> {
  const zip = new AdmZip(filePath);

  // Process each slide
  const slideEntries = zip.getEntries().filter(e =>
    e.entryName.match(/ppt\/slides\/slide\d+\.xml$/)
  );

  for (const entry of slideEntries) {
    const xml = entry.getData().toString('utf8');
    const processed = processSlideXml(xml);
    zip.updateFile(entry.entryName, Buffer.from(processed));
  }

  zip.writeZip(filePath);
}

function processSlideXml(xml: string): string {
  // 1. Parse XML
  // 2. Find shapes with objectName containing ':'
  // 3. Group by prefix (e.g., 'card-123')
  // 4. Calculate bounding box for each group
  // 5. Wrap in <p:grpSp> elements
  // 6. Return modified XML
}
```

### Step 6: Add Dependencies

**File:** `package.json`
```json
{
  "dependencies": {
    "adm-zip": "^0.5.10",
    "fast-xml-parser": "^4.3.2"
  }
}
```

### Step 7: Integrate into Presentation

**File:** `core/presentation.ts`
```typescript
import { groupShapesInPptx, resetGroupCounter } from './grouper.js';

async writeFile(filename: string, options?: { groupComponents?: boolean }): Promise<void> {
  resetGroupCounter();  // Reset for each presentation
  await this.pptx.writeFile({ fileName: filename });

  if (options?.groupComponents !== false) {  // Default: true
    await groupShapesInPptx(filename);
  }
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `core/utils.ts` | NEW: Group ID generation |
| `core/components/Card.ts` | Add objectName to shapes |
| `core/components/Text.ts` | Add optional objectName prop |
| `core/components/Image.ts` | Add optional objectName prop |
| `core/components/Table.ts` | Add objectName to borders and cells |
| `core/grouper.ts` | NEW: PPTX post-processor |
| `core/presentation.ts` | Integrate grouping into writeFile |
| `package.json` | Add adm-zip, fast-xml-parser |

---

## Verification

1. `npm run build` - TypeScript compiles
2. Run showcase: `npx tsx showcase.ts`
3. Open showcase.pptx in PowerPoint
4. Open Selection Pane (Home > Arrange > Selection Pane)
5. Verify Cards appear as grouped objects (expandable in pane)
6. Click a Card - entire card should select
7. Double-click to enter group - individual elements editable
