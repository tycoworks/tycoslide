// Declarative API Test
// Simple test to verify the declarative architecture works

import {
  Presentation,
  text,
  h1,
  h2,
  column,
  row,
  card,
  GAP,
  TEXT_STYLE,
  VALIGN,
} from '../src/index.js';

// Use Materialize theme (has real font paths)
import { theme } from '../../consulting/clients/materialize/theme/dist/index.js';

async function main() {
  console.log('Creating declarative presentation...');

  const pres = new Presentation(theme);

  // Slide 1: Simple text
  pres.add({
    content: column(
      { gap: GAP.NORMAL, vAlign: VALIGN.MIDDLE },
      h1('Welcome to Declarative TycoSlide'),
      text('This is the new architecture - pure data, clean pipeline.', { style: TEXT_STYLE.BODY }),
    ),
  });

  // Slide 2: Row with cards
  pres.add({
    content: column(
      { gap: GAP.NORMAL },
      h2('Three Benefits'),
      row(
        { gap: GAP.NORMAL },
        card({ title: 'Simple', description: 'No more theme threading' }),
        card({ title: 'Testable', description: 'Pure data structures' }),
        card({ title: 'Flexible', description: 'Easy to transform' }),
      ),
    ),
  });

  // Write file
  await pres.writeFile('declarative-test.pptx');
  console.log('Created declarative-test.pptx');
}

main().catch(console.error);
