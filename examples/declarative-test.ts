// Declarative API Test
// Simple test to verify the new declarative architecture works

import {
  DeclarativePresentation,
  textNode,
  h1Node,
  h2Node,
  columnNode,
  rowNode,
  cardNode,
  GAP,
  TEXT_STYLE,
  JUSTIFY,
} from '../src/index.js';

// Use Materialize theme (has real font paths)
import { theme } from '../../consulting/clients/materialize/theme/dist/index.js';

async function main() {
  console.log('Creating declarative presentation...');

  const pres = new DeclarativePresentation(theme);

  // Slide 1: Simple text
  pres.add({
    content: columnNode(
      { gap: GAP.NORMAL, justify: JUSTIFY.CENTER },
      h1Node('Welcome to Declarative TycoSlide'),
      textNode('This is the new architecture - pure data, clean pipeline.', { style: TEXT_STYLE.BODY }),
    ),
  });

  // Slide 2: Row with cards
  pres.add({
    content: columnNode(
      { gap: GAP.NORMAL },
      h2Node('Three Benefits'),
      rowNode(
        { gap: GAP.NORMAL },
        cardNode({ title: 'Simple', description: 'No more theme threading' }),
        cardNode({ title: 'Testable', description: 'Pure data structures' }),
        cardNode({ title: 'Flexible', description: 'Easy to transform' }),
      ),
    ),
  });

  // Write file
  await pres.writeFile('declarative-test.pptx');
  console.log('Created declarative-test.pptx');
}

main().catch(console.error);
